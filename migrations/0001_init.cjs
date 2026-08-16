/**
 * Initial migration: dedicated schema for District Runtime tables.
 * Runtime tables themselves arrive with the runtime worker (PR3);
 * this migration only establishes the namespace so `db:migrate` is a
 * meaningful acceptance step from PR1 onward.
 */
exports.up = (pgm) => {
  pgm.createSchema("district", { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropSchema("district", { ifExists: true });
};
