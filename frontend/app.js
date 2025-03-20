const GRAPHQL_URL = "http://localhost:4002/graphql"; // Posts-service GraphQL endpoint
const WEBSOCKET_URL = "ws://localhost:4002/graphql"; // WebSocket for subscriptions

async function createPost(title, content) {
    const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            query: `mutation ($title: String!, $content: String!) {
                createPost(title: $title, content: $content) {
                    id
                    title
                    content
                }
            }`,
            variables: { title, content },
        }),
    });

    const responseBody = await response.json();
    console.log("Mutation Response:", responseBody);

    if (responseBody.data?.createPost) {
        console.log("Post created successfully.");
    } else {
        console.error("Error creating post:", responseBody.errors);
    }
}

// WebSocket subscription setup
function subscribeToNewPosts() {
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = () => {
        console.log("Connected to WebSocket server");
        ws.send(JSON.stringify({ type: "connection_init" }));

        ws.send(JSON.stringify({
            id: "1",
            type: "start",
            payload: { query: `subscription { postAdded { id title content } }` }
        }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Subscription event received:", data);

        if (data.type === "data" && data.payload?.data?.postAdded) {
            addPostToTable(data.payload.data.postAdded);
        }
    };

    ws.onerror = (error) => console.error("WebSocket Error:", error);
    ws.onclose = () => console.log("WebSocket connection closed");
}

// Add post to table
function addPostToTable(post) {
    const table = document.getElementById("posts-table");
    if (!table) {
        console.error("Table element not found!");
        return;
    }

    const row = table.insertRow();
    row.insertCell(0).textContent = post.id;
    row.insertCell(1).textContent = post.title;
    row.insertCell(2).textContent = post.content;
}

// Ensure DOM is loaded before attaching event listener
document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("add-post-btn");
    if (!button) {
        console.error("Button not found!");
        return;
    }

    button.addEventListener("click", async () => {
        const title = document.getElementById("post-title")?.value;
        const content = document.getElementById("post-content")?.value;

        if (!title || !content) {
            console.error("Title and content are required!");
            return;
        }

        await createPost(title, content);
    });

    // Start WebSocket subscription when the page loads
    subscribeToNewPosts();
});
