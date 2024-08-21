import { JSX, ParentComponent, Show, createSignal, onMount } from "solid-js";

/**
 * Children will not be rendered on the server.
 * @param props.fallback Fallback content to render on the server.
 *
 * @example
 *
 * ```tsx
 * <ClientOnly>
 *  <WalletComponent />
 * </ClientOnly>
 * ```
 */
export const ClientOnly: ParentComponent<{
  fallback?: JSX.Element;
}> = (props) => {
  const [isMounted, setIsMounted] = createSignal(false);
  onMount(() => {
    setIsMounted(true);
  });
  return (
    <Show when={isMounted()} fallback={props.fallback}>
      {props.children}
    </Show>
  );
};
