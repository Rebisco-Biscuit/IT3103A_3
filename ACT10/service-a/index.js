import stompit from "stompit";
import { ApolloServer } from "apollo-server-express";
import { makeExecutableSchema } from "@graphql-tools/schema";
import express from "express";
import http from "http";
import { gql } from "apollo-server-core";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const httpServer = http.createServer(app);

// ActiveMQ Connection Settings
const connectionOptions = {
  host: "localhost",
  port: 61613,
  connectHeaders: {
    host: "/",
    login: "admin",
    passcode: "admin",
  },
};

// GraphQL Schema
const typeDefs = gql`
  type Post {
    id: ID!
    title: String!
    content: String!
  }

  type Query {
    posts: [Post!]
  }

  type Mutation {
    createPost(title: String!, content: String!): Post!
  }
`;

const resolvers = {
  Query: {
    posts: async () => await prisma.post.findMany(),
  },
  Mutation: {
    createPost: async (_, { title, content }) => {
      return await prisma.post.create({ data: { title, content } });
    },
  },
};

// Initialize Apollo Server
const schema = makeExecutableSchema({ typeDefs, resolvers });
const server = new ApolloServer({ schema });

await server.start();
server.applyMiddleware({ app, cors: { origin: "*" } });

httpServer.listen(4002, () => {
  console.log(`🚀 GraphQL API running at http://localhost:4002/graphql`);
});

// ActiveMQ Subscriber
stompit.connect(connectionOptions, (error, client) => {
  if (error) {
    console.error("❌ Failed to connect to ActiveMQ:", error.message);
    return;
  }

  console.log("✅ Connected to ActiveMQ (Service A)");

  client.subscribe({ destination: "/queue/newPosts", ack: "client-individual" }, async (error, message) => {
    if (error) {
      console.error("❌ Subscription error:", error.message);
      return;
    }

    message.readString("utf-8", async (error, body) => {
      if (error) {
        console.error("❌ Message read error:", error.message);
        return;
      }

      const postData = JSON.parse(body);
      console.log("📥 Received new post:", postData);

      await prisma.post.create({ data: postData });
      client.ack(message);
    });
  });
});
