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
      if (message.includes("Duration")) {
        const [duration] = message.split(",");
        const [_, time] = duration.trim().split(" ");
        let [hours, minutes, seconds] = time.split(":");
        const parsedHours = parseInt(hours) * 60 * 60;
        const parsedMinutes = parseInt(minutes) * 60;
        const parsedSeconds = parseInt(seconds);
        const totalDuration = parsedHours + parsedMinutes + parsedSeconds;

        const seekStart = document.getElementById(
          "seek-start"
        ) as HTMLInputElement;
        const seekEnd = document.getElementById("seek-end") as HTMLInputElement;

        seekStart.max = totalDuration.toString();
        seekStart.disabled = false;
        seekStart.value = "0";
        seekEnd.max = totalDuration.toString();
        seekEnd.disabled = false;
        seekEnd.value = "5";
      }
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

const changeFile = async ({
  target: { files },
}: {
  target: { files: FileList };
}) => {
  if (!ffmpeg) return;
  const { name } = files[0];
  tempFile = files[0];

  await ffmpeg.writeFile(name, await fetchFile(files[0]));
  await ffmpeg.exec(["-i", name]);

  const video = document.getElementById("vid") as HTMLVideoElement;
  const url = URL.createObjectURL(files[0]);
  video.src = url;

  const progressBar = document.getElementById(
    "progress-bar"
  ) as HTMLProgressElement;
  progressBar.value = 0;
  progressBar.innerHTML = "0";

  const downloadContainer = document.getElementById(
    "download-output"
  ) as HTMLDivElement;
  if (downloadContainer.childNodes.length > 0) {
    downloadContainer.removeChild(downloadContainer.firstChild as ChildNode);
  }
};

const generateGif = async () => {
  if (!ffmpeg || !tempFile) return;

  const seekStart = document.getElementById("seek-start") as HTMLInputElement;
  const seekEnd = document.getElementById("seek-end") as HTMLInputElement;

  const [parsedFileName] = tempFile.name.split(".");

  await ffmpeg.exec([
    "-i",
    tempFile.name,
    "-ss",
    seekStart.value.toString(),
    "-to",
    seekEnd.value.toString(),
    "-s",
    "320:240",
    "-r",
    "24",
    `${parsedFileName}.gif`,
  ]);

  const data = await ffmpeg.readFile(`${parsedFileName}.gif`);
  const url = URL.createObjectURL(
    //@ts-ignore
    new Blob([data.buffer], { type: "image/gif" })
  );

  const a = document.createElement("a");
  a.href = url;
  a.download = `${parsedFileName}.gif`;
  a.innerHTML = "Download Here";
  const outputContainer = document.getElementById("download-output");
  outputContainer?.appendChild(a);
  await ffmpeg.deleteFile(`${parsedFileName}.gif`);
};

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="min-w-[60vw]">
    <div class="flex flex-col justify-center items-center gap-2">
      <button id="loader" type="button">Load FFMPEG</button>
      <video controls id="vid"></video>
      <input id="file-input" disabled type="file" accept="video/*" class="p-2" />
      <label id="seek-label-start">Start</label>
      <input type="range" step="1" class="w-full" id="seek-start" disabled />
      <label id="seek-label-end">End</label>
      <input type="range" step="1" class="w-full" id="seek-end" disabled />
      <progress id="progress-bar" max="100" min="0" class="w-full rounded"></progress>
    </div>
    <button id="gen-gif" class="mt-2">Generate GIF</button>
    <div id="download-output" class="mt-3"></div>
  </div>
`;

document.getElementById("loader")?.addEventListener("click", load);
//@ts-ignore
document.getElementById("file-input")?.addEventListener("change", changeFile);
document.getElementById("gen-gif")?.addEventListener("click", generateGif);

const changeSeekStart = (e: Event) => {
  const label = document.getElementById("seek-label-start") as HTMLLabelElement;
  label.innerHTML = (e.target as unknown as { value: string }).value;
};

const changeSeekEnd = (e: Event) => {
  const label = document.getElementById("seek-label-end") as HTMLLabelElement;
  label.innerHTML = (e.target as unknown as { value: string }).value;
};

(document.getElementById("seek-start") as HTMLInputElement).addEventListener(
  "input",
  changeSeekStart
);
(document.getElementById("seek-end") as HTMLInputElement).addEventListener(
  "input",
  changeSeekEnd
);
