const codeEditor =
  document.getElementById("code");

const output =
  document.getElementById("output");

const filename =
  document.getElementById("filename");

const lineNumbers =
  document.getElementById("lineNumbers");

const status =
  document.getElementById("status");

const executionState =
  document.getElementById(
    "executionState"
  );


function updateLineNumbers() {
  const lines =
    codeEditor.value.split("\n").length;

  lineNumbers.textContent =
    Array.from(
      { length: lines },
      (_, i) => i + 1
    ).join("\n");
}


codeEditor.addEventListener(
  "input",
  updateLineNumbers
);


codeEditor.addEventListener(
  "scroll",
  () => {
    lineNumbers.scrollTop =
      codeEditor.scrollTop;
  }
);


updateLineNumbers();


async function runCode() {

  output.textContent =
    "Running...";

  executionState.textContent =
    "Running";

  status.textContent =
    "Executing";

  removePlots();

  try {

    const response =
      await fetch(
        "/api/execute",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            code:
              codeEditor.value
          })
        }
      );

    const result =
      await response.json();

    if (!result.success) {

      output.textContent =
        "Execution Error:\n\n" +
        result.error;

      executionState.textContent =
        "Error";

      status.textContent =
        "Failed";

      return;
    }

    output.textContent =
      result.output ||
      "(no output)";

    executionState.textContent =
      "Completed";

    status.textContent =
      "Ready";

    if (
      result.plots &&
      result.plots.length
    ) {
      result.plots.forEach(
        createPlot
      );
    }

  } catch (error) {

    output.textContent =
      "Connection error:\n\n" +
      error.message;

    executionState.textContent =
      "Offline";

    status.textContent =
      "Error";
  }
}


function createPlot(plot) {

  const container =
    document.createElement(
      "div"
    );

  container.className =
    "smat-plot";

  const title =
    document.createElement(
      "div"
    );

  title.textContent =
    "Figure";

  title.className =
    "plot-title";

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = 800;
  canvas.height = 420;

  container.appendChild(title);
  container.appendChild(canvas);

  document
    .querySelector(".outputPanel")
    .appendChild(container);

  drawPlot(
    canvas,
    plot.x,
    plot.y
  );
}


function drawPlot(
  canvas,
  x,
  y
) {

  const ctx =
    canvas.getContext("2d");

  const width =
    canvas.width;

  const height =
    canvas.height;

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  if (
    !x.length ||
    !y.length
  ) {
    return;
  }

  const minX =
    Math.min(...x);

  const maxX =
    Math.max(...x);

  const minY =
    Math.min(...y);

  const maxY =
    Math.max(...y);

  const left = 70;
  const right = 30;
  const top = 30;
  const bottom = 55;

  const graphWidth =
    width -
    left -
    right;

  const graphHeight =
    height -
    top -
    bottom;

  const rangeX =
    maxX - minX || 1;

  const rangeY =
    maxY - minY || 1;


  function px(value) {
    return (
      left +
      ((value - minX) /
        rangeX) *
        graphWidth
    );
  }


  function py(value) {
    return (
      top +
      graphHeight -
      ((value - minY) /
        rangeY) *
        graphHeight
    );
  }


  // Grid
  ctx.beginPath();

  for (
    let i = 0;
    i <= 10;
    i++
  ) {

    const gx =
      left +
      (i / 10) *
        graphWidth;

    const gy =
      top +
      (i / 10) *
        graphHeight;

    ctx.moveTo(
      gx,
      top
    );

    ctx.lineTo(
      gx,
      top +
        graphHeight
    );

    ctx.moveTo(
      left,
      gy
    );

    ctx.lineTo(
      left +
        graphWidth,
      gy
    );
  }

  ctx.strokeStyle =
    "#dddddd";

  ctx.lineWidth = 1;

  ctx.stroke();


  // Axes
  ctx.beginPath();

  ctx.moveTo(
    left,
    top
  );

  ctx.lineTo(
    left,
    top +
      graphHeight
  );

  ctx.lineTo(
    left +
      graphWidth,
    top +
      graphHeight
  );

  ctx.strokeStyle =
    "#222";

  ctx.lineWidth = 2;

  ctx.stroke();


  // Curve
  ctx.beginPath();

  for (
    let i = 0;
    i < Math.min(
      x.length,
      y.length
    );
    i++
  ) {

    const X =
      px(Number(x[i]));

    const Y =
      py(Number(y[i]));

    if (i === 0) {
      ctx.moveTo(
        X,
        Y
      );
    } else {
      ctx.lineTo(
        X,
        Y
      );
    }
  }

  ctx.strokeStyle =
    "#167c4a";

  ctx.lineWidth = 3;

  ctx.stroke();


  // Labels
  ctx.fillStyle =
    "#111";

  ctx.font =
    "14px Arial";

  ctx.fillText(
    String(minX),
    left,
    height - 20
  );

  ctx.fillText(
    String(maxX),
    width - right - 30,
    height - 20
  );

  ctx.fillText(
    String(maxY),
    10,
    top + 10
  );

  ctx.fillText(
    String(minY),
    10,
    top +
      graphHeight
  );
}


function removePlots() {

  document
    .querySelectorAll(
      ".smat-plot"
    )
    .forEach(
      element =>
        element.remove()
    );
}


document
  .getElementById("newBtn")
  .addEventListener(
    "click",
    () => {

      if (
        !confirm(
          "Create a new file?"
        )
      ) {
        return;
      }

      filename.value =
        "untitled.m";

      codeEditor.value =
        "% New SMAT script\n\n";

      output.textContent =
        "";

      executionState.textContent =
        "Idle";

      status.textContent =
        "Ready";

      removePlots();

      updateLineNumbers();
    }
  );


async function saveFile(
  saveAs = false
) {

  let name =
    filename.value.trim();

  if (saveAs) {

    const requested =
      prompt(
        "Enter filename:",
        name
      );

    if (!requested) {
      return;
    }

    name =
      requested;

    if (
      !name.endsWith(".m")
    ) {
      name += ".m";
    }

    filename.value =
      name;
  }

  try {

    const response =
      await fetch(
        "/api/files/save",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            filename: name,
            content:
              codeEditor.value
          })
        }
      );

    const result =
      await response.json();

    if (!result.success) {
      alert(result.error);
      return;
    }

    status.textContent =
      "Saved";

  } catch (error) {

    alert(
      "Save failed: " +
      error.message
    );
  }
}


document
  .getElementById("saveBtn")
  .addEventListener(
    "click",
    () =>
      saveFile(false)
  );


document
  .getElementById("saveAsBtn")
  .addEventListener(
    "click",
    () =>
      saveFile(true)
  );


document
  .getElementById("clearBtn")
  .addEventListener(
    "click",
    () => {

      output.textContent =
        "";

      executionState.textContent =
        "Idle";

      removePlots();
    }
  );


document
  .getElementById("runBtn")
  .addEventListener(
    "click",
    runCode
  );


codeEditor.addEventListener(
  "keydown",
  event => {

    if (
      event.ctrlKey &&
      event.key === "Enter"
    ) {

      event.preventDefault();

      runCode();
    }


    if (
      event.key === "Tab"
    ) {

      event.preventDefault();

      const start =
        codeEditor.selectionStart;

      const end =
        codeEditor.selectionEnd;

      codeEditor.value =
        codeEditor.value.substring(
          0,
          start
        ) +
        "    " +
        codeEditor.value.substring(
          end
        );

      codeEditor.selectionStart =
        codeEditor.selectionEnd =
          start + 4;

      updateLineNumbers();
    }
  }
);
