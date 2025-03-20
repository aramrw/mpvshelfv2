import { createSignal, Show } from "solid-js";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogAction
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";

interface ErrorAlertProps {
  error: string;
  onClick?: (event: MouseEvent) => void;
}

function ErrorAlert(props: ErrorAlertProps) {
  // Handle Windows paths and error messages appropriately
  const parseErrorMessage = (error: string) => {
    // First, try to match a Windows path pattern
    const windowsPathMatch = error.match(/^([A-Za-z]:\\[^:]+):(.*)/);
    if (windowsPathMatch) {
      return {
        title: windowsPathMatch[1], // Full Windows path
        description: windowsPathMatch[2].trim() // Rest of the error message
      };
    }

    // If not a Windows path, split on first colon only
    const firstColonIndex = error.indexOf(':');
    if (firstColonIndex === -1) {
      return {
        title: error,
        description: ''
      };
    }

    return {
      title: error.slice(0, firstColonIndex),
      description: error.slice(firstColonIndex + 1).trim()
    };
  };

  const [dialogOpen, setDialogOpen] = createSignal<boolean>(true);
  const { title, description } = parseErrorMessage(props.error);

  return (
    <AlertDialog open={dialogOpen()}>
      <AlertDialogTrigger />
      <AlertDialogContent class="bg-accent min-h-40 min-w-40 
				border-destructve-foreground border-2">
        <AlertDialogHeader class="space-y-0">
          <h1 class="mb-4 text-md font-semibold bg-destructive 
						w-fit rounded-sm text-destructive-foreground px-1">
            Error
          </h1>
          <AlertDialogTitle
            class="text-md w-full text-destructive-foreground 
						bg-muted/30 px-2 rounded-sm rounded-b-none py-0"
          >
            <code>{title} : </code>
          </AlertDialogTitle>
          <AlertDialogDescription
            class="font-medium w-full text-white px-2 pb-1 
						bg-muted/30 rounded-sm rounded-t-none"
          >
            <code>
              {description}
            </code>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Show
            when={props.onClick}
            fallback={
              <Button
                variant="destructive"
                class="min-w-14 bg-destructive text-destructive-foreground hover:bg-primary"
                onClick={() => setDialogOpen(false)}
              >
                Close
              </Button>
            }
          >
            <AlertDialogAction
              class="bg-destructive hover:bg-red-600"
              onClick={props.onClick}
            >
              Continue
            </AlertDialogAction>
          </Show>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export default ErrorAlert;

