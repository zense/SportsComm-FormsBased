import React from "react";
import loginBg from "./138077.jpg"; // add a suitable calming background image in your project

export default function Login({ signIn }) {
  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundColor: "#f4f6f8",
      }}
    >
      <div className="bg-white p-10 rounded-3xl shadow-xl w-96 text-center backdrop-blur-md">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">
          Sports Equipment Manager
        </h1>
        <p className="mb-6 text-gray-600">
          Login with your Microsoft account to continue
        </p>
        <button
          onClick={signIn}
          className="bg-[#2F2F9D] hover:bg-[#1F1F77] text-white font-bold py-3 px-6 rounded-full transition-all duration-300 shadow-md"
        >
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );
}
