interface Props {
  progress: number;
}

export default function ProgressBar({ progress }: Props) {
  return (
    <div className="w-32 bg-slate-700 rounded-full h-1.5">
      <div
        className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
