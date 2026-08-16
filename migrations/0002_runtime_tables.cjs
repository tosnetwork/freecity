/**
 * District Runtime durable records (Runtime spec §8.1, Implementation Plan §3).
 *
 * Determinism note: step_time values are stored as ISO-8601 text, not
 * timestamptz, so recorded step times round-trip byte-identically into replay.
 * Wall-clock columns used only for ordering/observability stay timestamptz.
 */
exports.up = (pgm) => {
  pgm.createTable(
    { schema: "district", name: "district_runtime" },
    {
      district_id: { type: "text", notNull: true },
      season_id: { type: "text", notNull: true },
      state: { type: "jsonb", notNull: true },
      state_version: { type: "bigint", notNull: true },
      last_sequence: { type: "bigint", notNull: true },
      ruleset_version: { type: "text", notNull: true },
      status: { type: "text", notNull: true, default: "active" },
      updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    },
  );
  pgm.addConstraint({ schema: "district", name: "district_runtime" }, "district_runtime_pk", {
    primaryKey: ["district_id", "season_id"],
  });

  pgm.createTable(
    { schema: "district", name: "district_command" },
    {
      command_id: { type: "text", primaryKey: true },
      district_id: { type: "text", notNull: true },
      season_id: { type: "text", notNull: true },
      idempotency_key: { type: "text", notNull: true },
      command_type: { type: "text", notNull: true },
      schema_version: { type: "integer", notNull: true },
      actor_ref: { type: "text", notNull: true },
      actor_authority: { type: "text", notNull: true },
      payload: { type: "jsonb", notNull: true },
      status: { type: "text", notNull: true, default: "received" },
      district_sequence: { type: "bigint" },
      result: { type: "jsonb" },
      step_time: { type: "text" },
      received_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
      applied_at: { type: "timestamptz" },
    },
  );
  pgm.addConstraint(
    { schema: "district", name: "district_command" },
    "district_command_idempotency_uq",
    { unique: ["district_id", "season_id", "idempotency_key"] },
  );
  pgm.addConstraint(
    { schema: "district", name: "district_command" },
    "district_command_sequence_uq",
    { unique: ["district_id", "season_id", "district_sequence"] },
  );
  pgm.createIndex({ schema: "district", name: "district_command" }, ["district_id", "season_id"], {
    name: "district_command_received_idx",
    where: "status = 'received'",
  });

  pgm.createTable(
    { schema: "district", name: "district_event" },
    {
      district_id: { type: "text", notNull: true },
      season_id: { type: "text", notNull: true },
      district_sequence: { type: "bigint", notNull: true },
      event_seq: { type: "integer", notNull: true },
      command_id: { type: "text", notNull: true },
      event_type: { type: "text", notNull: true },
      authority_class: { type: "text", notNull: true, default: "district_runtime" },
      privacy_scope: { type: "text", notNull: true, default: "district" },
      payload: { type: "jsonb", notNull: true },
      created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    },
  );
  pgm.addConstraint({ schema: "district", name: "district_event" }, "district_event_pk", {
    primaryKey: ["district_id", "season_id", "district_sequence", "event_seq"],
  });

  pgm.createTable(
    { schema: "district", name: "district_snapshot" },
    {
      snapshot_id: { type: "bigserial", primaryKey: true },
      district_id: { type: "text", notNull: true },
      season_id: { type: "text", notNull: true },
      state_version: { type: "bigint", notNull: true },
      last_sequence: { type: "bigint", notNull: true },
      ruleset_version: { type: "text", notNull: true },
      checksum: { type: "text", notNull: true },
      reason: { type: "text", notNull: true },
      state: { type: "jsonb", notNull: true },
      created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    },
  );
  pgm.createIndex(
    { schema: "district", name: "district_snapshot" },
    ["district_id", "season_id", "last_sequence"],
    { name: "district_snapshot_lookup_idx" },
  );

  pgm.createTable(
    { schema: "district", name: "scheduled_effect" },
    {
      district_id: { type: "text", notNull: true },
      season_id: { type: "text", notNull: true },
      effect_key: { type: "text", notNull: true },
      effect_type: { type: "text", notNull: true },
      due_at: { type: "text", notNull: true },
      created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    },
  );
  pgm.addConstraint({ schema: "district", name: "scheduled_effect" }, "scheduled_effect_pk", {
    primaryKey: ["district_id", "season_id", "effect_key"],
  });
  pgm.createIndex({ schema: "district", name: "scheduled_effect" }, ["due_at"], {
    name: "scheduled_effect_due_idx",
  });

  pgm.createTable(
    { schema: "district", name: "outbox" },
    {
      district_id: { type: "text", notNull: true },
      season_id: { type: "text", notNull: true },
      district_sequence: { type: "bigint", notNull: true },
      event_seq: { type: "integer", notNull: true },
      published_at: { type: "timestamptz" },
    },
  );
  pgm.addConstraint({ schema: "district", name: "outbox" }, "outbox_pk", {
    primaryKey: ["district_id", "season_id", "district_sequence", "event_seq"],
  });
  pgm.createIndex({ schema: "district", name: "outbox" }, ["district_id", "season_id"], {
    name: "outbox_unpublished_idx",
    where: "published_at IS NULL",
  });
};

exports.down = (pgm) => {
  for (const name of [
    "outbox",
    "scheduled_effect",
    "district_snapshot",
    "district_event",
    "district_command",
    "district_runtime",
  ]) {
    pgm.dropTable({ schema: "district", name });
  }
};
