export default function PointCloudBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
      {/* Blob 1 - Blue */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-3xl opacity-20 animate-blob"
        style={{
          background: 'radial-gradient(circle, #007AFF 0%, transparent 70%)',
          top: '10%',
          left: '20%',
          animationDelay: '0s',
        }}
      />

      {/* Blob 2 - Purple */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-3xl opacity-15 animate-blob"
        style={{
          background: 'radial-gradient(circle, #5856D6 0%, transparent 70%)',
          top: '40%',
          right: '15%',
          animationDelay: '2s',
        }}
      />

      {/* Blob 3 - Cyan */}
      <div
        className="absolute w-[450px] h-[450px] rounded-full blur-3xl opacity-20 animate-blob"
        style={{
          background: 'radial-gradient(circle, #00C7BE 0%, transparent 70%)',
          bottom: '20%',
          left: '30%',
          animationDelay: '4s',
        }}
      />

      {/* Blob 4 - Pink */}
      <div
        className="absolute w-[550px] h-[550px] rounded-full blur-3xl opacity-15 animate-blob"
        style={{
          background: 'radial-gradient(circle, #FF2D55 0%, transparent 70%)',
          bottom: '30%',
          right: '25%',
          animationDelay: '6s',
        }}
      />

      {/* Noise overlay for texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
