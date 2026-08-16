/**
 * Application tables (Implementation Plan §3): accounts, dev auth codes,
 * sessions, residents, and season membership. Gameplay state stays in the
 * runtime; these tables own identity and membership only.
 */
exports.up = (pgm) => {
  pgm.createSchema("app", { ifNotExists: true });

  pgm.createTable(
    { schema: "app", name: "account" },
    {
      account_id: { type: "uuid", primaryKey: true },
      email: { type: "text", notNull: true, unique: true },
      created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    },
  );

  pgm.createTable(
    { schema: "app", name: "auth_code" },
    {
      email: { type: "text", notNull: true },
      code: { type: "text", notNull: true },
      expires_at: { type: "timestamptz", notNull: true },
      consumed_at: { type: "timestamptz" },
      created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    },
  );
  pgm.createIndex({ schema: "app", name: "auth_code" }, ["email", "code"], {
    name: "auth_code_lookup_idx",
  });

  pgm.createTable(
    { schema: "app", name: "session" },
    {
      token: { type: "text", primaryKey: true },
      account_id: { type: "uuid", notNull: true },
      created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
      expires_at: { type: "timestamptz", notNull: true },
    },
  );

  pgm.createTable(
    { schema: "app", name: "resident" },
    {
      resident_id: { type: "text", primaryKey: true },
      account_id: { type: "uuid" },
      kind: { type: "text", notNull: true },
      role: { type: "text", notNull: true },
      display_name: { type: "text", notNull: true },
      created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    },
  );
  // One human resident per account; AI residents have NULL account_id.
  pgm.createIndex({ schema: "app", name: "resident" }, ["account_id"], {
    name: "resident_account_uq",
    unique: true,
    where: "account_id IS NOT NULL",
  });

  pgm.createTable(
    { schema: "app", name: "season_member" },
    {
      district_id: { type: "text", notNull: true },
      season_id: { type: "text", notNull: true },
      resident_id: { type: "text", notNull: true },
      role: { type: "text", notNull: true },
      sponsored_ai_resident_id: { type: "text" },
      last_today_sequence: { type: "bigint", notNull: true, default: 0 },
      joined_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    },
  );
  pgm.addConstraint({ schema: "app", name: "season_member" }, "season_member_pk", {
    primaryKey: ["district_id", "season_id", "resident_id"],
  });
};

exports.down = (pgm) => {
  for (const name of ["season_member", "resident", "session", "auth_code", "account"]) {
    pgm.dropTable({ schema: "app", name });
  }
  pgm.dropSchema("app", { ifExists: true });
};
