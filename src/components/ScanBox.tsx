/**
 * Supermarket-style scanning. A USB/Bluetooth barcode scanner "types" the code and presses Enter,
 * so this box stays focused and adds one code per scan. Duplicates are refused instantly.
 * On phones without a scanner, the camera button uses the browser's BarcodeDetector (Chrome on Android).
 */
import { useEffect, useRef, useState } from 'react';
import { Camera, ScanLine, X } from 'lucide-react';

interface Props {
  codes: string[];
  onChange: (codes: string[]) => void;
  /** Called for each new code; return an error message to reject it. */
  validate?: (code: string) => string | null | Promise<string | null>;
  placeholder?: string;
}

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

const buzz = () => {
  try { navigator.vibrate?.(200); } catch { /* ignore */ }
};

export function ScanBox({ codes, onChange, validate, placeholder = 'Scan or type, then Enter' }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [camera, setCamera] = useState(false);
  const codesRef = useRef(codes);
  codesRef.current = codes;
  const hasDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  const add = async (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    if (codesRef.current.includes(code)) {
      setMsg({ text: `${code} already scanned`, bad: true });
      buzz();
      return;
    }
    const error = validate ? await validate(code) : null;
    if (error) {
      setMsg({ text: error, bad: true });
      buzz();
      return;
    }
    onChange([...codesRef.current, code]);
    setMsg({ text: `Added ${code}`, bad: false });
  };

  // Camera scanning loop
  useEffect(() => {
    if (!camera) return;
    let stream: MediaStream | null = null;
    let stop = false;
    let last = '';
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const Ctor = (window as unknown as { BarcodeDetector: new () => Detector }).BarcodeDetector;
        const detector = new Ctor();
        while (!stop && video.current) {
          const found = await detector.detect(video.current).catch(() => []);
          const code = found[0]?.rawValue;
          if (code && code !== last) {
            last = code;
            await add(code);
          }
          await new Promise((r) => setTimeout(r, 400));
        }
      } catch {
        setMsg({ text: 'Camera not available. Allow camera access or use a scanner.', bad: true });
        setCamera(false);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camera]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add(value);
                setValue('');
              }
            }}
            placeholder={placeholder}
            autoComplete="off"
            className="w-full h-10 rounded-lg border border-border bg-background pl-9 pr-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {hasDetector && (
          <button type="button" onClick={() => setCamera((c) => !c)} title="Scan with camera"
            className={`h-10 px-3 rounded-lg border text-sm ${camera ? 'bg-blue-600 text-white border-blue-600' : 'border-border'}`}>
            <Camera className="w-4 h-4" />
          </button>
        )}
      </div>
      {camera && <video ref={video} className="w-full max-h-56 rounded-lg bg-black object-cover" muted playsInline />}
      {msg && <p className={`text-xs ${msg.bad ? 'text-red-600' : 'text-green-700'}`}>{msg.text}</p>}
      {codes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {codes.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-mono">
              {c}
              <button type="button" aria-label={`Remove ${c}`} onClick={() => onChange(codes.filter((x) => x !== c))}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{codes.length} scanned</p>
    </div>
  );
}

export default ScanBox;
