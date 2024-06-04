import "./style.css";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let tempFile: File;

const load = async () => {
  const baseUrl = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    ffmpeg.on("log", ({ message }) => {
      console.log(message);
    });
    ffmpeg.on("progress", ({ progress }) => {
      document.getElementById("progress")!.innerHTML = (progress * 100).toFixed(
        2
      );
      const progressBar = document.getElementById(
        "progress-bar"
      ) as HTMLProgressElement;
      progressBar.value = parseInt((progress * 100).toFixed(2));
      progressBar.innerHTML = (progress * 100).toFixed(2);
    });

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseUrl}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseUrl}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });
    document.getElementById("loader")?.remove();
    (document.getElementById("file-input") as HTMLInputElement).disabled =
      false;
  }
};

const trim = async ({ target: { files } }: { target: { files: FileList } }) => {
  if (!ffmpeg) return;
  const { name } = files[0];
  tempFile = files[0];

  console.log(tempFile);

  await ffmpeg.writeFile(name, await fetchFile(files[0]));
  // await ffmpeg.exec([
  //   "-i",
  //   name,
  //   "-ss",
  //   "0",
  //   "-to",
  //   "3",
  //   "-s",
  //   "640:480",
  //   "output.mp4",
  // ]);

  // const data = await ffmpeg.readFile("output.mp4");

  const video = document.getElementById("vid") as HTMLVideoElement;
  const url = URL.createObjectURL(files[0]);
  video.src = url;
};

const generateGif = async () => {
  if (!ffmpeg || !tempFile) return;

  await ffmpeg.exec([
    "-i",
    tempFile.name,
    "-ss",
    "0",
    "-to",
    "5",
    "-s",
    "320:240",
    "output.gif",
  ]);

  const data = await ffmpeg.readFile("output.gif");
  const url = URL.createObjectURL(
    //@ts-ignore
    new Blob([data.buffer], { type: "image/gif" })
  );

  const a = document.createElement("a");
  a.href = url;
  a.download = "output.gif";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <div class="flex flex-col gap-2">
      <button id="loader" type="button">Load FFMPEG</button>
      <video controls id="vid" class="rounded-md"></video>
      <input id="file-input" disabled type="file" accept="video/*" class="p-2" />
      <label>Time</label>
      <progress id="progress-bar" max="100" min="0" class="w-full"></progress>
    </div>
    <p id="progress"></p>
    <button id="gen-gif">Generate GIF</button
  </div>
`;

document.getElementById("loader")?.addEventListener("click", load);
//@ts-ignore
document.getElementById("file-input")?.addEventListener("change", trim);
document.getElementById("gen-gif")?.addEventListener("click", generateGif);
