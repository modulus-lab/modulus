import { useState, useEffect } from "react";

function App() {
  const [message, setMessage] = useState<string>("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/hello")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => console.error(err));
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Sample React + Express App</h1>
      <p>This app demonstrates a Vite React app with Express APIs.</p>

      <div style={{ marginTop: "2rem" }}>
        <h2>API Test</h2>
        {message && <p>Message from API: {message}</p>}
        <button onClick={fetchUsers} disabled={loading}>
          {loading ? "Loading..." : "Fetch Users"}
        </button>
        {users.length > 0 && (
          <ul>
            {users.map((user) => (
              <li key={user.id}>{user.name}</li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h2>Routes</h2>
        <ul>
          <li>
            <a href="/">Home</a>
          </li>
          <li>
            <a href="/about">About (React Route)</a>
          </li>
          <li>
            <a href="/api/hello">API: /api/hello</a>
          </li>
          <li>
            <a href="/api/users">API: /api/users</a>
          </li>
          <li>
            <a href="/health">Health Check</a>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default App;
