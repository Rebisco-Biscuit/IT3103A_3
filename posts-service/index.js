import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { ApolloServer } from "apollo-server-express";
import { makeExecutableSchema } from "@graphql-tools/schema";
import express from "express";
import http from "http";
import { gql } from "apollo-server-core";
import EventEmitter from "events";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


const eventEmitter = new EventEmitter();
eventEmitter.setMaxListeners(100); // Prevents potential memory leaks

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

    type Subscription {
        postAdded: Post! # ✅ Changed from [Post!] to Post!
    }
`;

const posts = [];

const resolvers = {
    Query: {
        posts: async () => {
            return await prisma.post.findMany(); // Fetch from DB
        },
    },
    
    Mutation: {
        createPost: async (_, { title, content }) => {
            const newPost = await prisma.post.create({
                data: { title, content },
            });
    
            console.log("📢 New post added:", newPost);
    
            eventEmitter.emit("POST_ADDED", newPost); // Notify subscribers
            return newPost;
        },
    },
    
    Subscription: {
        postAdded: {
            subscribe: (_, __, context) => {
                if (!context || !context.eventEmitter) {
                    throw new Error("❌ Missing eventEmitter in WebSocket context!");
                }
    
                return {
                    [Symbol.asyncIterator]: async function* () {
                        while (true) {
                            const newPost = await new Promise((resolve) =>
                                context.eventEmitter.once("POST_ADDED", resolve)
                            );
    
                            if (!newPost) {
                                console.error("⚠️ Received null post data!");
                                continue;
                            }
    
                            console.log("📡 Sending new post to subscribers:", newPost);
                            yield { postAdded: newPost };
                        }
                    },
                };
            },
        },
    }
    
    
};

// Express & Apollo Setup
const app = express();
const httpServer = http.createServer(app);
const schema = makeExecutableSchema({ typeDefs, resolvers });

const server = new ApolloServer({ schema });
await server.start();
server.applyMiddleware({ app, cors: { origin: "*" } });

// WebSocket Setup
const wsServer = new WebSocketServer({ server: httpServer, path: "/graphql" });
useServer({ 
    schema, 
    context: () => ({ eventEmitter }) // Ensure eventEmitter is included
}, wsServer);


// Start HTTP & WebSocket Server
const PORT = 4002;
httpServer.listen(PORT, () => {
    console.log(`🚀 GraphQL API running at http://localhost:${PORT}/graphql`);
    console.log(`🔄 WebSocket active at ws://localhost:${PORT}/graphql`);
});
