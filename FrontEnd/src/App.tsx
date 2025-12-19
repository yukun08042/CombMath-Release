import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { routes } from '@generouted/react-router/lazy';

// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import { MantineProvider, rem } from '@mantine/core';
import { Notifications } from '@mantine/notifications';


const router = createBrowserRouter(routes);

export default function App() {
  return (
    <MantineProvider>
      <Notifications position="top-right" zIndex={1000} styles={{
        root: {
          maxWidth: rem(300),
        }
      }}/>
      <RouterProvider router={router} />
    </MantineProvider>
  );
}
