type Props = {
  title: string;
  description: string;
};

export function WorkflowPagePlaceholder({ title, description }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-12">
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
  );
}
