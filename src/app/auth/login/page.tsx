"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard");
  };

  return (
    <div style={{minHeight:"100vh",background:"#080808",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace"}}>
      <div style={{width:"100%",maxWidth:"400px",padding:"0 24px"}}>
        <div style={{marginBottom:"48px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"32px"}}>
            <div style={{width:"8px",height:"8px",borderRadius:"50%",background:"#FF3B30"}}></div>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"24px",letterSpacing:"0.05em",color:"#f0f0f0"}}>BURN RATE</span>
          </div>
          <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"48px",color:"#f0f0f0",letterSpacing:"0.02em",lineHeight:"1",marginBottom:"8px"}}>WELCOME BACK.</h1>
          <p style={{color:"#555",fontSize:"13px"}}>Sign in to your dashboard</p>
        </div>
        <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="dev@yourcompany.com" required
            style={{background:"#0f0f0f",border:"1px solid rgba(255,255,255,0.08)",color:"#f0f0f0",padding:"14px 16px",fontSize:"12px",letterSpacing:"0.05em",outline:"none",width:"100%"}}
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" required
            style={{background:"#0f0f0f",border:"1px solid rgba(255,255,255,0.08)",color:"#f0f0f0",padding:"14px 16px",fontSize:"12px",letterSpacing:"0.05em",outline:"none",width:"100%"}}
          />
          {error && <p style={{color:"#FF3B30",fontSize:"12px"}}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{background:"#FF3B30",color:"white",border:"none",padding:"14px",fontSize:"11px",letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",marginTop:"8px"}}>
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>
        </form>
        <p style={{color:"#444",fontSize:"12px",marginTop:"24px",textAlign:"center"}}>
          No account?{" "}
          <a href="/auth/signup" style={{color:"#FF3B30",textDecoration:"none"}}>Create one</a>
        </p>
      </div>
    </div>
  );
}
