const { ApolloServer, gql } = require("apollo-server");
const { PrismaClient } = require("@prisma/client");
const { PubSub } = require("graphql-subscriptions"); // ✅ Correct import

const prisma = new PrismaClient();
const pubsub = new PubSub(); // ✅ Now this will work
const POST_ADDED = "POST_ADDED";

const typeDefs = gql`
  type Post {
    id: ID!
    title: String!
    content: String!
  }

  type Query {
    posts: [Post]
    post(id: ID!): Post
  }

  type Mutation {
    createPost(title: String!, content: String!): Post
    updatePost(id: ID!, title: String, content: String): Post
    deletePost(id: ID!): Post
  }

  type Subscription {
    postAdded: Post
  }
`;

const resolvers = {
  Query: {
    posts: () => prisma.post.findMany(),
    post: (_, { id }) => prisma.post.findUnique({ where: { id: Number(id) } }),
  },
  Mutation: {
    createPost: async (_, { title, content }) => {
      const newPost = await prisma.post.create({ data: { title, content } });

      // Publish the event
      pubsub.publish(POST_ADDED, { postAdded: newPost });

      return newPost;
    },
    updatePost: (_, { id, title, content }) =>
      prisma.post.update({ where: { id: Number(id) }, data: { title, content } }),
    deletePost: (_, { id }) => prisma.post.delete({ where: { id: Number(id) } }),
  },
  Subscription: {
    postAdded: {
      subscribe: () => pubsub.asyncIterator([POST_ADDED]),
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  subscriptions: {
    path: "/graphql",
  },
});

server.listen({ port: 4002 }).then(({ url }) => {
  console.log(`🚀 Posts service running at ${url}`);
});
