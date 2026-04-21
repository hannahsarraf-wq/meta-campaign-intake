import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Home page redirects to the campaign intake form
 */
export default function Home() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to the intake form
    setLocation("/intake");
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-600">Redirecting to Meta Campaign Intake Tool...</p>
      </div>
    </div>
  );
}
