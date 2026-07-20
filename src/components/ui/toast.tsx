import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * Sonner-based toast surface (the current shadcn/ui default for "Toast").
 *
 * Usage:
 *   import { toast } from 'sonner';
 *   toast.success('Contribution recorded');
 *
 * Mount <Toaster /> once near the app root.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-line-200 group-[.toaster]:shadow-pop group-[.toaster]:rounded-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
