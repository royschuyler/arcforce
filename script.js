window.onload = function() {
  // Get DOM elements.
  var canvas = document.getElementById("myCanvas");
  var ctx = canvas.getContext("2d");
  var aSlider = document.getElementById("aSlider");
  var sizeSlider = document.getElementById("sizeSlider");
  var plotsSelect = document.getElementById("plotsSelect");
  var downloadBtn = document.getElementById("downloadBtn");
  var aValueSpan = document.getElementById("aValue");
  var sizeValueSpan = document.getElementById("sizeValue");

  // Adjust canvas for high resolution (retina).
  var dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);

  // Fixed parameter.
  var b = 1.0;
  
  // Utility: degrees to radians.
  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  // Convert model (x,y) to canvas coordinates.
  // Origin at center; flip y-axis.
  function modelToCanvas(pt) {
    return {
      x: pt.x * scaleFactor,
      y: -pt.y * scaleFactor
    };
  }

  // Compute P points on the ellipse.
  // Total points = 4 * (plotsPerQuadrant - 1).
  function computePPoints(a, b, plotsPerQuadrant) {
    var totalPoints = 4 * (plotsPerQuadrant - 1);
    var P = [];
    for (var i = 0; i < totalPoints; i++) {
      var angleDeg = 90 - i * (360 / totalPoints);
      var angleRad = degToRad(angleDeg);
      var x = a * Math.sin(angleRad);
      var y = b * Math.cos(angleRad);
      P.push({ x: x, y: y });
    }
    return P;
  }

  // Helper math functions.
  function midpoint(P, Q) {
    return { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 };
  }

  function slopeLine(P, Q) {
    if (Math.abs(P.x - Q.x) < 1e-12) return null;
    return (Q.y - P.y) / (Q.x - P.x);
  }

  function perpSlope(m) {
    if (m === null) return 0;
    if (Math.abs(m) < 1e-12) return null;
    return -1 / m;
  }

  function lineIntersection(pA, mA, pB, mB) {
    if (mA === null && mB === null) return null;
    if (mA === null) {
      var x = pA.x;
      return { x: x, y: mB * (x - pB.x) + pB.y };
    }
    if (mB === null) {
      var x = pB.x;
      return { x: x, y: mA * (x - pA.x) + pA.y };
    }
    var denom = mA - mB;
    if (Math.abs(denom) < 1e-12) return null;
    var x = ((mA * pA.x - pA.y) - (mB * pB.x - pB.y)) / denom;
    var y = mA * (x - pA.x) + pA.y;
    return { x: x, y: y };
  }

  // Compute center of circle through three points.
  function circleCenter(P_prev, P_curr, P_next) {
    var mid1 = midpoint(P_prev, P_curr);
    var m1 = slopeLine(P_prev, P_curr);
    var bis1 = perpSlope(m1);

    var mid2 = midpoint(P_curr, P_next);
    var m2 = slopeLine(P_curr, P_next);
    var bis2 = perpSlope(m2);

    return lineIntersection(mid1, bis1, mid2, bis2);
  }

  // Draw the entire scene.
  function draw() {
    // Update parameters from sliders and dropdown.
    a = parseFloat(aSlider.value);
    scaleFactor = parseFloat(sizeSlider.value);
    aValueSpan.textContent = a;
    sizeValueSpan.textContent = scaleFactor;
    var plotsPerQuadrant = parseInt(plotsSelect.value);
    var totalPoints = 4 * (plotsPerQuadrant - 1);  // total unique P points.

    // Clear canvas.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up coordinate system: origin at center, y-axis flipped.
    ctx.save();
    ctx.translate(canvas.width / (2 * dpr), canvas.height / (2 * dpr));

    // Draw x- and y-axes (very thin lines).
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-canvas.width/(2*dpr), 0);
    ctx.lineTo(canvas.width/(2*dpr), 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -canvas.height/(2*dpr));
    ctx.lineTo(0, canvas.height/(2*dpr));
    ctx.stroke();

    // Compute P points.
    var P = computePPoints(a, b, plotsPerQuadrant);

    // Draw the ellipse as a smooth black curve with thin line.
    ctx.strokeStyle = "black";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    var resolution = 400;
    for (var i = 0; i <= resolution; i++) {
      var t = degToRad(90 - i * (360 / resolution));
      var x = a * Math.sin(t);
      var y = b * Math.cos(t);
      var pt = modelToCanvas({ x: x, y: y });
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();

    // Draw P points as small red dots.
    ctx.fillStyle = "red";
    for (var i = 0; i < P.length; i++) {
      var pt = modelToCanvas(P[i]);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI); // small radius
      ctx.fill();
      // Label the P points.
      ctx.fillStyle = "black";
      ctx.font = "8px Arial";
      ctx.fillText("P" + i, pt.x + 3, pt.y - 3);
      ctx.fillStyle = "red";
    }

    // Compute f points using circleCenter method.
    var f_points = [];
    for (var i = 0; i < totalPoints; i++) {
      var P_prev = P[(i - 1 + totalPoints) % totalPoints];
      var P_curr = P[i];
      var P_next = P[(i + 1) % totalPoints];
      var center = circleCenter(P_prev, P_curr, P_next);
      f_points.push(center);
    }

    // Connect f points with thin red lines.
    ctx.strokeStyle = "red";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (var i = 0; i < f_points.length; i++) {
      var pt = modelToCanvas(f_points[i]);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw f points as small dark green dots.
    ctx.fillStyle = "darkgreen";
    for (var i = 0; i < f_points.length; i++) {
      var pt = modelToCanvas(f_points[i]);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI); // small radius
      ctx.fill();
      // Label f points.
      ctx.fillStyle = "black";
      ctx.font = "8px Arial";
      ctx.fillText("f" + i, pt.x + 3, pt.y - 3);
      ctx.fillStyle = "darkgreen";
    }

    ctx.restore();
  }

  // Download button event: download the canvas as PNG.
  downloadBtn.addEventListener("click", function() {
    // Convert canvas to data URL.
    var dataURL = canvas.toDataURL("image/png");
    // Create a temporary link and click it.
    var link = document.createElement("a");
    link.href = dataURL;
    link.download = "ellipse.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Set up event listeners for controls.
  aSlider.addEventListener("input", draw);
  sizeSlider.addEventListener("input", draw);
  plotsSelect.addEventListener("change", draw);

  // Initial draw.
  draw();
};
