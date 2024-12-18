import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../components/ui/alert";

const AlertDemo = ({ title, desc }: { title: string, desc: string }) => {
  return (
    <Alert>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        viewBox="0 0 24 24"
      >
        <path
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="m5 7l5 5l-5 5m7 2h7"
        />
      </svg>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {desc}
      </AlertDescription>
    </Alert>
  );
};

export default AlertDemo;

