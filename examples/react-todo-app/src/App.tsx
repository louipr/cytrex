import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TodoProvider } from './contexts/TodoContext';
import { Header } from './components/Header';
import { TodoList } from './components/TodoList';
import { AddTodo } from './components/AddTodo';
import { TodoStats } from './components/TodoStats';
// import { TodoExport } from './components/TodoExport'; // Dead import - export feature was removed
import './App.css';

function App() {
  return (
    <TodoProvider>
      <Router>
        <div className="App">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={
                <>
                  <AddTodo />
                  <TodoList />
                  <TodoStats />
                </>
              } />
              <Route path="/stats" element={<TodoStats />} />
            </Routes>
          </main>
        </div>
      </Router>
    </TodoProvider>
  );
}

export default App;
