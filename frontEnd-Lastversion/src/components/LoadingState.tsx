interface Props {
  message?: string;
}

export default function LoadingState({ message = 'Loading...' }: Props) {
  return (
    <div className="glass rounded-3xl p-8 text-center border border-white/5">
      <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-lime animate-spin mx-auto mb-4" />
      <p className="text-neutral-400 text-sm">{message}</p>
    </div>
  );
}
