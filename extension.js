const vscode = require("vscode");

// This regex loosely matches your CSS variables in the format:
//   --background: 0 0% 93%;
const HSL_VAR_REGEX =
    /--([\w-]+)\s*:\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*;?/g;

function activate(context) {
    // Register a DocumentColorProvider
    const provider = {
        provideDocumentColors(document) {
            const colors = [];
            for (let i = 0; i < document.lineCount; i++) {
                const lineText = document.lineAt(i).text;
                let match;
                while ((match = HSL_VAR_REGEX.exec(lineText)) !== null) {
                    const varName = match[1];
                    const h = parseFloat(match[2]);
                    const s = parseFloat(match[3]) / 100; // convert to fraction
                    const l = parseFloat(match[4]) / 100; // convert to fraction
                    // Create a range for the matched text
                    const startPos = match.index;
                    const endPos = match.index + match[0].length;
                    const range = new vscode.Range(
                        new vscode.Position(i, startPos),
                        new vscode.Position(i, endPos)
                    );

                    // Create a Color object from HSL
                    const color = new vscode.Color(
                        ...hslToRgb(h, s, l),
                        1.0 // alpha
                    );

                    colors.push(
                        new vscode.ColorInformation(range, color)
                    );
                }
            }
            return colors;
        },

        provideColorPresentations(color, context) {
            // Convert the Color object back to the H S% L% format
            const { range } = context;
            const [h, s, l] = rgbToHsl(color.red, color.green, color.blue);

            // Round or keep decimals as you wish
            const hStr = h.toFixed(1).replace(/\.0$/, ""); // remove trailing .0
            const sStr = (s * 100).toFixed(1).replace(/\.0$/, "");
            const lStr = (l * 100).toFixed(1).replace(/\.0$/, "");

            // Build the text we’ll replace in the editor
            const colorText = `${hStr} ${sStr}% ${lStr}%`;

            // Provide at least one presentation
            const presentation = new vscode.ColorPresentation(
                `--var: ${colorText};`
            );

            // If we want to preserve the variable name, we can parse it from the line text
            // but for simplicity, just replace everything within the matched range:
            presentation.textEdit = new vscode.TextEdit(range, `--var-name: ${colorText};`);

            return [presentation];
        },
    };

    context.subscriptions.push(
        vscode.languages.registerColorProvider({ language: "css" }, provider)
    );
}

// Basic HSL -> RGB function
function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
    else if (h >= 60 && h < 120) [r, g, b] = [x, c, 0];
    else if (h >= 120 && h < 180) [r, g, b] = [0, c, x];
    else if (h >= 180 && h < 240) [r, g, b] = [0, x, c];
    else if (h >= 240 && h < 300) [r, g, b] = [x, 0, c];
    else if (h >= 300 && h < 360) [r, g, b] = [c, 0, x];

    return [r + m, g + m, b + m];
}

// Basic RGB -> HSL function
function rgbToHsl(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;
    const d = max - min;

    if (d === 0) {
        h = s = 0;
    } else {
        s = d / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case r:
                h = ((g - b) / d) % 6;
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }
    return [h, s, l];
}

exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
