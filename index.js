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

  type User {
    id: ID!
    name: String!
    todos: [Todo]!
  }

  input CreateTodoInput {
    text: String!
    userId: ID!
  }

  input CreateUserInput {
    name: String!
  }

  type Query {
    todos: [Todo]!
    users: [User]!
  }

  type Mutation {
    createTodo(data: CreateTodoInput): Todo!
    createUser(data: CreateUserInput): User!
  }
`;

const resolvers = {
  User: {
    todos: async (root, __, { db }) => {
      const postedByIndex = await db.transaction('todos').objectStore('todos').index('postedBy').getAll(root.id);

      return postedByIndex;
    }
  },
  Query: {
    todos: async (_, __, { db }) => {
      const todos = await db.transaction('todos').objectStore('todos').getAll();
      return todos;
    },
    users: async (_, __, { db }) => {
      const users = await db.transaction('users').objectStore('users').getAll();
      return users;
    }
  },
  Mutation: {
    createUser: async (root, { data: { name } }, { db }) => {
      const tx = db.transaction('users', 'readwrite');
      const usersStore = tx.objectStore('users');
      const newUserId = await usersStore.put({
        id: uuid(),
        name
      });

      const user = usersStore.get(newUserId);

      await tx.complete

      return user;
    },
    createTodo: async (root, { data: { text, userId } }, { db }) => {
      const tx = db.transaction(['todos'], 'readwrite');
      const todosStore = tx.objectStore('todos');

      const newTodoId = await todosStore.add({
        id: uuid(),
        createdAt: new Date / 1000,
        text,
        done: false,
        postedBy: userId
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
const button = document.getElementById('new-user');

button.addEventListener('click', (e) => {
  gdb.query(`
    mutation CreateUser($name: String!) {
      createUser(data: { name: $name }) {
        id
      }
    }
  `, { name: 'Carson' })
    .then(r => {
      const { data: { createUser } } = r;

      localStorage.setItem('user', createUser.id);
      render();
    })
    .catch(err => console.log(err));
})

form.addEventListener('submit', (e) => {
  e.preventDefault();

  gdb.query(`
    mutation CreateTodo($text: String!, $user: ID!) {
      createTodo(data: { text: $text, userId: $user}) {
        id
      }
    }
  `, {
      text: input.value,
      user: localStorage.getItem('user'),
    })
    .then(id => {
      console.log(id);
      input.value = '';

      render();
    });
})

async function render() {
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }

  const { data } = await gdb.query(`
    {
      todos {
        id
        text
        done
      }
    }
  `);
  if (data) {
    const { todos } = data;

    const userId = localStorage.getItem('user');
    document.getElementById('user').innerText = userId;

    todos.forEach(todo => {
      const el = document.createElement('li');

      el.textContent = todo.text;

      list.appendChild(el);
    });
  }
}

render();

gdb.query(`
  query {
    users {
      todos {
        id
      }
    }
  }
`)
  .then(console.log);