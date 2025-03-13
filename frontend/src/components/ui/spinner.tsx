import { CircularProgress } from "@/components/ui/material";

export function Spinner() {
  return (
    <CircularProgress 
      size={24} 
      sx={{ 
        color: 'primary.main',
        margin: '0 auto'
      }} 
    />
  );
} 