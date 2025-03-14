"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Trash, LogOut, Edit, CheckCircle } from "lucide-react";
import { Pie, Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from "chart.js";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";

ChartJS.register(CategoryScale, LinearScale, ArcElement, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const router = useRouter();
  const [username, setUsername] = useState("John Doe");
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [editTaskId, setEditTaskId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      } else {
        setIsLoggedIn(true);
        setUserId(user.uid);
        setUsername(user.email.split("@")[0]);
        fetchTasks(user.uid);
      }
    });

    return () => unsubscribe(); // Clean up auth listener
  }, []);

  const fetchTasks = async (uid) => {
    try {
      setLoading(true);
      const taskRef = collection(db, `users/${uid}/tasks`);
      const querySnapshot = await getDocs(taskRef);
      const taskList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(taskList);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async () => {
    if (newTask.trim() !== "" && userId) {
      try {
        const taskRef = collection(db, `users/${userId}/tasks`);
        if (editTaskId) {
          const taskDoc = doc(db, `users/${userId}/tasks`, editTaskId);
          await updateDoc(taskDoc, { text: newTask });
          setEditTaskId(null);
        } else {
          await addDoc(taskRef, { text: newTask, completed: false });
        }
        setNewTask("");
        fetchTasks(userId);
      } catch (error) {
        console.error("Error adding task:", error);
      }
    }
  };

  const deleteTask = async (id) => {
    try {
      await deleteDoc(doc(db, `users/${userId}/tasks`, id));
      fetchTasks(userId);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const editTask = (task) => {
    setNewTask(task.text);
    setEditTaskId(task.id);
  };

  const toggleComplete = async (task) => {
    try {
      const taskRef = doc(db, `users/${userId}/tasks`, task.id);
      await updateDoc(taskRef, { completed: !task.completed });
      fetchTasks(userId);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (!isLoggedIn) return null;

  const completedTasks = tasks.filter((task) => task.completed).length;
  const pendingTasks = tasks.length - completedTasks;

  const pieData = {
    labels: ["Completed", "Pending"],
    datasets: [
      {
        data: [completedTasks, pendingTasks],
        backgroundColor: ["#4CAF50", "#FF5733"],
      },
    ],
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-900 to-purple-800 text-white">
      <div className="fixed top-4 left-4 z-50">
        <button
          className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-600 transition flex items-center gap-2"
          onClick={handleLogout}
        >
          <LogOut size={20} /> Logout
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-1 justify-center items-center p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl p-8 bg-white/10 rounded-lg shadow-lg backdrop-blur-lg mt-16"
        >
          <h1 className="text-4xl font-extrabold text-center mb-4">Task Manager</h1>
          <p className="text-lg text-center opacity-80">Welcome back, <span className="font-semibold">{username}</span>!</p>

          <div className="mt-8 flex gap-2">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="flex-1 p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter a new task"
            />
            <button onClick={addTask} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700">
              <Plus size={20} />
            </button>
          </div>

          {loading ? (
            <p className="text-center mt-6 opacity-70">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="text-center opacity-70 mt-6">No tasks added yet.</p>
          ) : (
            <ul className="space-y-3 mt-6">
              {tasks.map((task) => (
                <li key={task.id} className="flex justify-between items-center p-4 rounded-lg shadow-md bg-white/20">
                  <span className={task.completed ? "line-through" : ""}>{task.text}</span>
                  <div className="flex gap-2">
                    <button onClick={() => editTask(task)} className="text-blue-400 hover:text-blue-600">
                      <Edit size={20} />
                    </button>
                    <button onClick={() => toggleComplete(task)} className="text-green-400 hover:text-green-600">
                      <CheckCircle size={20} />
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="text-red-500 hover:text-red-700">
                      <Trash size={20} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  );
}
