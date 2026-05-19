/**
 * These flags switch react-router v6 over to the behaviour it will have in
 * the upcoming v7 release. Turning them on now stops the upgrade-warning
 * messages in the console and means the app already runs the same way it
 * will once we upgrade. Both the real router in main.tsx and the in-memory
 * routers used in tests pass this same constant.
 */
export const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;
