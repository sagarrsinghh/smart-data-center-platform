import { useEffect } from "react";
import { loginApi } from "./api/auth.api";

function App() {
  useEffect(() => {
    testLogin();
  }, []);

  const testLogin = async () => {
    try {
      const res = await loginApi({
         "email": "User@test.com",
         "password": "0123456"
      });

      console.log("LOGIN SUCCESS:", res.data);
    } catch (err) {
      console.error("LOGIN ERROR:", err);
    }
  };

  return <div>Check console</div>;
}

export default App;