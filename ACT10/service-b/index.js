import stompit from "stompit";
import { v4 as uuidv4 } from "uuid";

const connectionOptions = {
  host: "localhost",
  port: 61613, // STOMP protocol port
  connectHeaders: {
    host: "/",
    login: "admin",
    passcode: "admin",
  },
};

// Connect to ActiveMQ
stompit.connect(connectionOptions, (error, client) => {
  if (error) {
    console.error("❌ Failed to connect to ActiveMQ:", error.message);
    return;
  }

  console.log("✅ Connected to ActiveMQ (Service B)");

  setInterval(() => {
    const postData = {
      id: uuidv4(),
      title: `Post ${Math.floor(Math.random() * 100)}`,
      content: `Random content ${Math.random().toFixed(5)}`,
    };

    const frame = client.send({
      destination: "/queue/newPosts",
      "content-type": "application/json",
    });

    frame.write(JSON.stringify(postData));
    frame.end();

    console.log("📤 Published message:", postData);
  }, 5000); // Send a message every 5 seconds
});
