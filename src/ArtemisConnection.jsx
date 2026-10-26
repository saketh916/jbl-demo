import { AgentProvider } from '@koreai/artemis-web-sdk/react';

export default function ArtemisConnection({ children }) {
  return (
    <AgentProvider
      projectId={import.meta.env.VITE_ARTEMIS_PROJECT_ID}
      apiKey={import.meta.env.VITE_ARTEMIS_API_KEY}
      endpoint={import.meta.env.VITE_ARTEMIS_ENDPOINT}
      debug={true}
    >
      {children}
    </AgentProvider>
  );
}