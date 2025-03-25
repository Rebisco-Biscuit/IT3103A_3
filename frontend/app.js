const POSTS_QUERY = `
  query {
    posts {
      id
      title
      content
    }
  }
`;

const GRAPHQL_URL = "http://localhost:4002/graphql";
const WEBSOCKET_URL = "http://localhost:4002/graphql";

async function fetchPosts() {
    const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: POSTS_QUERY })
    });

    const { data } = await response.json();
    updateTable(data.posts);
}

function updateTable(posts) {
    const tableBody = document.getElementById("postsTable");
    tableBody.innerHTML = ""; // Clear table
    posts.forEach(post => {
        const row = `<tr>
            <td>${post.id}</td>
            <td>${post.title}</td>
            <td>${post.content}</td>
        </tr>`;
        tableBody.innerHTML += row;
    });
}

// Ensure GraphQL WebSocket client is loaded globally
const client = graphqlWs.createClient({ url: WEBSOCKET_URL });

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

    if (responseBody.errors) {
        console.error("Error creating post:", responseBody.errors);
    } else {
        console.log("Post created successfully.");

        const button = document.getElementById("add-post-btn");

        button.addEventListener("click", async () => {
            const title = document.getElementById("post-title");
            const content = document.getElementById("post-content");
        
            if(title.value && content.value){
                title.value = ""; 
                content.value = "";
            }

        });

        const somelabel = document.getElementById("somelabel");
        somelabel.textContent = "Post created successfully.";
    }
}

// WebSocket subscription setup
function subscribeToNewPosts() {
    console.log("🔄 Subscribing to new posts...");
    
    client.subscribe(
        { query: `subscription { postAdded { id title content } }` },
        {
            next: ({ data }) => {
                console.log("📩 Subscription Data Received:", data);

                if (data?.postAdded) {
                    addPostToTable(data.postAdded);
                } else {
                    console.warn("⚠️ No postAdded data received.");
                }
            },
            error: (err) => console.error("❌ Subscription error:", err),
            complete: () => console.log("✅ Subscription completed"),
        }
    );
}


// Add post to table
function addPostToTable(post) {
    console.log("📝 Adding post to table:", post);

    const tableBody = document.getElementById("postsTable"); // Fixed ID
    if (!tableBody) {
        console.error("❌ Table element not found!");
        return;
    }

    const row = tableBody.insertRow();
    row.insertCell(0).textContent = post.id;
    row.insertCell(1).textContent = post.title;
    row.insertCell(2).textContent = post.content;
}

// Ensure DOM is loaded before attaching event listener
document.addEventListener("DOMContentLoaded", () => {
    console.log("📌 DOM Loaded");

    const button = document.getElementById("add-post-btn");
    if (button) {
        button.addEventListener("click", async () => {
            const title = document.getElementById("post-title")?.value;
            const content = document.getElementById("post-content")?.value;

            if (!title || !content) {
                console.error("⚠️ Title and content are required!");
                return;
            }

            await createPost(title, content);
        });
    } else {
        console.error("❌ Button not found!");
    }
    fetchPosts();
    subscribeToNewPosts();
});
