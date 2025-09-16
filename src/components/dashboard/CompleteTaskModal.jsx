import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function CompleteTaskModal({ task, onConfirm }) {
  if (!task) {
    return null;
  }

  return (
    <AlertDialog open={!!task} onOpenChange={(isOpen) => !isOpen && onConfirm(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Timer Stopped</AlertDialogTitle>
          <AlertDialogDescription>
            You tracked time for the task: <span className="font-semibold text-gray-800">"{task.title}"</span>.
            <br />
            Is this task now complete?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onConfirm(false)}>
            No, it's not complete
          </Button>
          <Button onClick={() => onConfirm(true)} className="bg-green-600 hover:bg-green-700">
            Yes, mark as complete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}