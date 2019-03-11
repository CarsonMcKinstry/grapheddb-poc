import { openDb } from 'idb';
import { makeExecutableSchema } from 'graphql-tools';
import { graphql } from 'graphql';

export default class GraphedDB {
  constructor({ typeDefs, resolvers, context }) {
    this.context = context || {};
    this.dbPromise = openDb('__grapheddb', 1, (upgradeDb) => {
      switch (upgradeDb.oldVersion) {
        case 0:
          const todosStore = upgradeDb.createObjectStore('todos', { keyPath: 'id' });
      }
    })

    this.schema = makeExecutableSchema({ typeDefs, resolvers });
  }

  async query(q, vars = {}) {
    const db = await this.dbPromise;
    return graphql(this.schema, q, null, {
      ...this.context,
      db
    }, vars);
  }
}
