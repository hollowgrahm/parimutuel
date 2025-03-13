import { Container, Box } from '@mui/material';

interface PageContainerProps {
  children: React.ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          margin: '0 auto',
          py: 4,
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </Container>
  );
} 