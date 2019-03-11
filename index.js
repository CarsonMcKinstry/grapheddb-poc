/**
 * This is a proof of concept for accessing IndexedDB using a graphql interface, In order to
 * demonstrate this, I've created a simple todo application (I know, cliched).
 */

import gql from 'graphql-tag';

// utility for creating unique ids
import uuid from 'uuid/v4';

import GraphedDB from './gdb';

// type definitions 

const typeDefs = gql`
  type Todo {
    id: ID!
    done: Boolean!
    text: String!
  }

  input CreateTodoInput {
    text: String!
  }

  type Query {
    todos: [Todo]!
  }

  type Mutation {
    createTodo(data: CreateTodoInput): Todo!
  }
`;

const resolvers = {
  Query: {
    todos: async (_, __, { db }) => {
      const todos = await db.transaction('todos').objectStore('todos').getAll();
      return todos.sort((a, b) => a.createdAt - b.createdAt);
    }
  },
  Mutation: {
    createTodo: async (root, { data: { text }}, { db }) => {
      const tx = db.transaction('todos', 'readwrite');
      const todosStore = tx.objectStore('todos');
      const newTodoId = await todosStore.put({
        id: uuid(),
        createdAt: new Date / 1000,
        text,
        done: false,
      });

      const todo = todosStore.get(newTodoId);

      await tx.complete;

      return todo;
    } 
  }
}


const gdb = new GraphedDB({
  typeDefs,
  resolvers
});

const form = document.getElementById('new-todo-form')
const input = document.getElementById('new-todo-input');
const list = document.getElementById('todo-list');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  gdb.query(`
    mutation CreateTodo($text: String!) {
      createTodo(data: { text: $text }) {
        id
      }
    }
  `, {
    text: input.value
  })
    .then(id => {
      input.value = '';

      render();
    });
})

async function render() {

  while(list.firstChild) {
    list.removeChild(list.firstChild);
  }

  const { data: { todos } } = await gdb.query(`
    {
      todos {
        id
        text
        done
      }
    }
  `);
  todos.forEach(todo => {
    const el = document.createElement('li');

    el.textContent = todo.text;

    list.appendChild(el);
  });
}

render();