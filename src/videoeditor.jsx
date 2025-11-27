import React, { useRef, useState, useEffect } from "react";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

export default function VideoEditor() {
  const [mainFile, setMainFile] = useState(null);
  const [bgFile, setBgFile] = useState(null);

  const [maskX, setMaskX] = useState(540);
  const [maskY, setMaskY] = useState(960);
  const [maskR, setMaskR] = useState(300);

  const canvasRef = useRef(null);
  const vidMainRef = useRef(null);
  const vidBgRef = useRef(null);

  useEffect(() => {
    let raf;
    const draw = () => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      ctx.clearRect(0,0,c.width,c.height);

      const bg = vidBgRef.current;
      const main = vidMainRef.current;

      if (bg && bg.readyState >= 2) ctx.drawImage(bg,0,0,c.width,c.height);

      if (main && main.readyState >= 2) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(maskX, maskY, maskR, 0, Math.PI*2);
        ctx.clip();
        ctx.drawImage(main, maskX-maskR, maskY-maskR, maskR*2, maskR*2);
        ctx.restore();

        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(maskX, maskY, maskR, 0, Math.PI*2);
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [maskX,maskY,maskR,mainFile,bgFile]);

  useEffect(() => {
    if (mainFile && vidMainRef.current)
      vidMainRef.current.src = URL.createObjectURL(mainFile);
  }, [mainFile]);

  useEffect(() => {
    if (bgFile && vidBgRef.current)
      vidBgRef.current.src = URL.createObjectURL(bgFile);
  }, [bgFile]);

  const renderVideo = async () => {
    if (!mainFile || !bgFile) return alert("Загрузите два видео");

    const ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();

    await ffmpeg.FS("writeFile", "main.mp4", await fetchFile(mainFile));
    await ffmpeg.FS("writeFile", "bg.mp4", await fetchFile(bgFile));

    const filter = `[1:v]scale=1080:1920[bg];
                    [0:v]scale=${maskR*2}:${maskR*2},format=rgba,
                    geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='
                    if((X-${maskR})*(X-${maskR})+(Y-${maskR})*(Y-${maskR})<${maskR*maskR},255,0)'
                    [mainM];
                    [bg][mainM]overlay=${maskX-maskR}:${maskY-maskR}`;

    await ffmpeg.run(
      "-i","main.mp4",
      "-i","bg.mp4",
      "-filter_complex", filter,
      "-preset","fast",
      "out.mp4"
    );

    const data = ffmpeg.FS("readFile","out.mp4");
    const url = URL.createObjectURL(new Blob([data.buffer], { type:"video/mp4" }));

    const a = document.createElement("a");
    a.href = url;
    a.download = "result.mp4";
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs">Основное видео</label>
          <input type="file" accept="video/*" onChange={e=>setMainFile(e.target.files[0])}/>
        </div>
        <div>
          <label className="text-xs">Фоновое видео</label>
          <input type="file" accept="video/*" onChange={e=>setBgFile(e.target.files[0])}/>
        </div>
      </div>

      <div>
        <label className="text-xs">Радиус маски: {maskR}</label>
        <input type="range" min="50" max="600" value={maskR} onChange={e=>setMaskR(+e.target.value)} className="w-full"/>
      </div>

      <button onClick={renderVideo} className="bg-emerald-500 text-black px-4 py-2 rounded">
        Экспорт видео
      </button>

      <div className="relative border rounded" style={{aspectRatio:'9/16', maxHeight:'80vh'}}>
        <canvas ref={canvasRef} width={1080} height={1920} className="w-full h-full"/>
        <video ref={vidMainRef} style={{display:'none'}} playsInline muted loop />
        <video ref={vidBgRef} style={{display:'none'}} playsInline muted loop />
      </div>
    </div>
  );
}