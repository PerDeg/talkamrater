// Databaskopplingen ("connector"). Välj databas med miljövariabler, se .env.example.
// Stöder PostgreSQL, MySQL/MariaDB och SQLite via Knex.
import fs from 'node:fs';
import path from 'node:path';
import knexFactory from 'knex';

const CLIENTS = {
  sqlite: 'better-sqlite3', sqlite3: 'better-sqlite3', 'better-sqlite3': 'better-sqlite3',
  postgres: 'pg', postgresql: 'pg', pg: 'pg',
  mysql: 'mysql2', mariadb: 'mysql2', mysql2: 'mysql2'
};

export function dbConfigFromEnv(env = process.env) {
  const name = (env.DB_CLIENT || 'sqlite').toLowerCase();
  const client = CLIENTS[name];
  if (!client) throw new Error(`Okänd DB_CLIENT "${name}". Använd postgres, mysql, mariadb eller sqlite.`);

  let connection;
  if (client === 'better-sqlite3') {
    const filename = env.SQLITE_FILE || './data/talkamrater.db';
    if (filename !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
    connection = { filename };
  } else if (env.DATABASE_URL) {
    connection = env.DATABASE_URL;
    if (client === 'mysql2' && !/charset=/i.test(connection)) connection += (connection.includes('?') ? '&' : '?') + 'charset=utf8mb4';
  } else {
    connection = {
      host: env.DB_HOST || 'localhost',
      port: env.DB_PORT ? Number(env.DB_PORT) : undefined,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME || 'talkamrater'
    };
    if (client === 'mysql2') connection.charset = 'utf8mb4'; // emojis i namn och avatarer
    if (env.DB_SSL === 'true') connection.ssl = { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
  }

  const prefix = env.DB_TABLE_PREFIX ?? 'tk_';
  if (!/^[a-z0-9_]{0,20}$/i.test(prefix)) throw new Error('DB_TABLE_PREFIX får bara innehålla a–z, 0–9 och _');

  return {
    prefix,
    knex: {
      client,
      connection,
      useNullAsDefault: client === 'better-sqlite3',
      pool: client === 'better-sqlite3'
        ? { min: 1, max: 1, afterCreate: (conn, done) => { conn.pragma('foreign_keys = ON'); conn.pragma('journal_mode = WAL'); done(); } }
        : { min: 0, max: Number(env.DB_POOL_MAX || 5) }
    }
  };
}

export const tableNames = prefix => ({
  classes: `${prefix}classes`,
  players: `${prefix}players`,
  sessions: `${prefix}sessions`,
  progress: `${prefix}progress`,
  rounds: `${prefix}rounds`,
  events: `${prefix}events`,
  gifts: `${prefix}gifts`,
  cheers: `${prefix}cheers`
});

// Migrationerna ligger i koden så att de fungerar likadant i alla databaser.
function migrations(t, client) {
  // MySQL/MariaDB behöver utf8mb4 för emojis
  const cs = tb => { if (client === 'mysql2') { tb.charset('utf8mb4'); tb.collate('utf8mb4_unicode_ci'); } };
  return [{
    name: '001_init',
    async up(knex) {
      await knex.schema.createTable(t.classes, tb => {
        cs(tb);
        tb.increments('id').primary();
        tb.string('code', 16).notNullable().unique();
        tb.string('name', 80).notNullable();
        tb.integer('goal').notNullable().defaultTo(500);
        tb.bigInteger('created_at').notNullable();
      });
      await knex.schema.createTable(t.players, tb => {
        cs(tb);
        tb.increments('id').primary();
        tb.integer('class_id').unsigned().notNullable().references('id').inTable(t.classes).onDelete('CASCADE');
        tb.string('name', 40).notNullable();
        tb.string('avatar', 16).notNullable().defaultTo('🦊');
        tb.string('pin_hash', 200).nullable();
        tb.integer('failed').notNullable().defaultTo(0);
        tb.bigInteger('locked_until').nullable();
        tb.bigInteger('created_at').notNullable();
        tb.bigInteger('last_seen').nullable();
        tb.unique(['class_id', 'name']);
      });
      await knex.schema.createTable(t.sessions, tb => {
        cs(tb);
        tb.string('token_hash', 64).primary();
        tb.integer('player_id').unsigned().notNullable().references('id').inTable(t.players).onDelete('CASCADE');
        tb.bigInteger('created_at').notNullable();
        tb.bigInteger('last_seen').notNullable();
        tb.index(['player_id']);
      });
      await knex.schema.createTable(t.progress, tb => {
        cs(tb);
        tb.integer('player_id').unsigned().primary().references('id').inTable(t.players).onDelete('CASCADE');
        tb.text('data', 'mediumtext').notNullable();
        tb.integer('version').notNullable().defaultTo(1);
        tb.bigInteger('updated_at').notNullable();
      });
      await knex.schema.createTable(t.rounds, tb => {
        cs(tb);
        tb.increments('id').primary();
        tb.integer('player_id').unsigned().notNullable().references('id').inTable(t.players).onDelete('CASCADE');
        tb.string('level', 16).notNullable();
        tb.string('mode', 16).notNullable();
        tb.integer('stars').notNullable().defaultTo(0);
        tb.integer('score').notNullable().defaultTo(0);
        tb.integer('total').notNullable().defaultTo(0);
        tb.integer('mistakes').notNullable().defaultTo(0);
        tb.bigInteger('created_at').notNullable();
        tb.index(['player_id', 'created_at']);
      });
    },
    async down(knex) {
      for (const name of [t.rounds, t.progress, t.sessions, t.players, t.classes]) await knex.schema.dropTableIfExists(name);
    }
  }, {
    // Klassens händelseflöde ("Alva blev expert!") och hejarop på händelserna
    name: '002_events',
    async up(knex) {
      await knex.schema.createTable(t.events, tb => {
        cs(tb);
        tb.increments('id').primary();
        tb.integer('class_id').unsigned().notNullable().references('id').inTable(t.classes).onDelete('CASCADE');
        tb.integer('player_id').unsigned().notNullable().references('id').inTable(t.players).onDelete('CASCADE');
        tb.string('type', 16).notNullable();
        tb.string('detail', 40).notNullable().defaultTo('');
        tb.bigInteger('created_at').notNullable();
        tb.index(['class_id', 'created_at']);
        tb.index(['player_id']);
      });
      await knex.schema.createTable(t.cheers, tb => {
        cs(tb);
        tb.integer('event_id').unsigned().notNullable().references('id').inTable(t.events).onDelete('CASCADE');
        tb.integer('player_id').unsigned().notNullable().references('id').inTable(t.players).onDelete('CASCADE');
        tb.bigInteger('created_at').notNullable();
        tb.primary(['event_id', 'player_id']);
      });
    },
    async down(knex) {
      await knex.schema.dropTableIfExists(t.cheers);
      await knex.schema.dropTableIfExists(t.events);
    }
  }, {
    // Läraren kan låta klassens status visas på en extern webbsida (widget)
    name: '003_public_class',
    async up(knex) {
      await knex.schema.alterTable(t.classes, tb => { tb.boolean('public').notNullable().defaultTo(false); });
    },
    async down(knex) {
      await knex.schema.alterTable(t.classes, tb => { tb.dropColumn('public'); });
    }
  }, {
    // Läraren kan sätta ett fokustal för hela klassen eller för en elev, t.ex. "p7"
    name: '004_focus',
    async up(knex) {
      await knex.schema.alterTable(t.classes, tb => { tb.string('focus', 8).nullable(); });
      await knex.schema.alterTable(t.players, tb => { tb.string('focus', 8).nullable(); });
    },
    async down(knex) {
      await knex.schema.alterTable(t.players, tb => { tb.dropColumn('focus'); });
      await knex.schema.alterTable(t.classes, tb => { tb.dropColumn('focus'); });
    }
  }, {
    // Hemliga presenter: den som klarar dagens utmaning skickar en godsak
    // till en slumpad klasskompis husdjur. Mottagaren får aldrig veta vem.
    name: '005_gifts',
    async up(knex) {
      await knex.schema.createTable(t.gifts, tb => {
        cs(tb);
        tb.increments('id').primary();
        tb.integer('class_id').unsigned().notNullable().references('id').inTable(t.classes).onDelete('CASCADE');
        tb.integer('from_id').unsigned().notNullable().references('id').inTable(t.players).onDelete('CASCADE');
        tb.integer('to_id').unsigned().notNullable().references('id').inTable(t.players).onDelete('CASCADE');
        tb.string('treat', 16).notNullable();
        tb.boolean('seen').notNullable().defaultTo(false);
        tb.bigInteger('created_at').notNullable();
        tb.index(['to_id', 'seen']);
        tb.index(['from_id', 'created_at']);
      });
    },
    async down(knex) {
      await knex.schema.dropTableIfExists(t.gifts);
    }
  }];
}

export async function openDatabase(env = process.env) {
  const cfg = dbConfigFromEnv(env);
  const db = knexFactory(cfg.knex);
  const t = tableNames(cfg.prefix);
  const list = migrations(t, cfg.knex.client);
  await db.migrate.latest({
    tableName: `${cfg.prefix}migrations`,
    migrationSource: {
      getMigrations: async () => list,
      getMigrationName: m => m.name,
      getMigration: async m => m
    }
  });
  return { db, t, client: cfg.knex.client };
}

// Ger id för en ny rad oavsett databas (MySQL stöder inte RETURNING).
export async function insertId(db, client, table, row) {
  if (client === 'mysql2') { const [id] = await db(table).insert(row); return Number(id); }
  const [r] = await db(table).insert(row).returning('id');
  return Number(typeof r === 'object' ? r.id : r);
}
