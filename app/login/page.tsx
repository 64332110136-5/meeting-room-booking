"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarCheck, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (isRegister) {
        // 1. สมัครสมาชิกใหม่ใน Supabase Auth
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        // 2. บันทึกข้อมูลเพิ่มเติมลงตาราง User (สิทธิ์เริ่มต้นเป็น USER)
        if (authData.user) {
          const { error: dbError } = await supabase.from("User").insert([
            {
              id: authData.user.id,
              email,
              fullName,
              department,
              role: "USER",
            },
          ]);
          if (dbError) throw dbError;
        }

        alert("สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...");
        router.push("/");
      } else {
        // เข้าสู่ระบบ
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        // ตรวจสอบสิทธิ์ (Role) เพื่อพาไปยังหน้าที่เหมาะสม
        if (authData.user) {
          const { data: userData } = await supabase
            .from("User")
            .select("role")
            .eq("id", authData.user.id)
            .single();

          if (userData?.role === "ADMIN") {
            router.push("/admin");
          } else {
            router.push("/");
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 mb-1">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isRegister ? "สมัครสมาชิกใหม่" : "เข้าสู่ระบบจองห้องประชุม"}
          </h1>
          <p className="text-sm text-slate-500">
            {isRegister ? "กรอกข้อมูลเพื่อเริ่มใช้งานระบบจองห้อง" : "กรุณาเข้าสู่ระบบเพื่อดำเนินการจองห้องประชุม"}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">ชื่อ-นามสกุล *</Label>
                <Input
                  id="fullName"
                  placeholder="เช่น นายสมชาย ใจดี"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department">แผนก / ฝ่าย</Label>
                <Input
                  id="department"
                  placeholder="เช่น ฝ่ายไอที, ฝ่ายบุคคล"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">อีเมล *</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">รหัสผ่าน *</Label>
            <Input
              id="password"
              type="password"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <Lock className="w-4 h-4 mr-1.5" />
            {loading ? "กำลังดำเนินการ..." : isRegister ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <div className="text-center text-sm text-slate-600 pt-2 border-t">
          {isRegister ? "มีบัญชีผู้ใช้งานอยู่แล้ว?" : "ยังไม่มีบัญชีผู้ใช้งาน?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg("");
            }}
            className="text-blue-600 font-semibold hover:underline"
          >
            {isRegister ? "เข้าสู่ระบบที่นี่" : "สมัครสมาชิกใหม่"}
          </button>
        </div>
      </div>
    </div>
  );
}