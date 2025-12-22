import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react"; // Import useState for CSS animation control

const NotFound = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false); // State to control animation

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    // Trigger animation after component mounts
    setIsVisible(true);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4">
      {/* Embedded CSS for animations */}
      <style>
        {`
        .fade-in-scale-container {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }
        .fade-in-scale-container.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .fade-in-text {
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .fade-in-text.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .fade-in-button {
          opacity: 0;
          transform: scale(0.8);
          transition: opacity 0.5s ease-out, transform 0.5s ease-out;
        }
        .fade-in-button.is-visible {
          opacity: 1;
          transform: scale(1);
        }

        /* Delay animations using CSS */
        .fade-in-text:nth-child(1).is-visible { transition-delay: 0.3s; } /* For 404 h1 */
        .fade-in-text:nth-child(2).is-visible { transition-delay: 0.4s; } /* For Oops! p */
        .fade-in-text:nth-child(3).is-visible { transition-delay: 0.5s; } /* For The page... p */
        .fade-in-button.is-visible { transition-delay: 0.6s; }
        `}
      </style>

      <div
        className={`text-center bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 sm:p-12 max-w-md w-full
          fade-in-scale-container ${isVisible ? 'is-visible' : ''}`}
      >
        <h1
          className={`text-7xl sm:text-9xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-4 tracking-tight
            fade-in-text ${isVisible ? 'is-visible' : ''}`}
        >
          404
        </h1>
        <p
          className={`text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-6
            fade-in-text ${isVisible ? 'is-visible' : ''}`}
        >
          Oops! Looks like you've wandered off the path.
        </p>
        <p
          className={`text-md sm:text-lg text-gray-500 dark:text-gray-400 mb-8
            fade-in-text ${isVisible ? 'is-visible' : ''}`}
        >
          The page you're looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <a
          href="/"
          className={`inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg
            fade-in-button ${isVisible ? 'is-visible' : ''}`}
        >
          Go Back Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;