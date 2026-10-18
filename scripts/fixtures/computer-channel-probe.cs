// Passive, owned UI target: no capture, input injection or helper protocol.
// Every interaction is performed by the documented Computer Use API.
using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

class ComputerChannelProbe : Form
{
    readonly Label status = new Label();
    readonly TextBox input = new TextBox();
    readonly string log;
    int clicks;
    int keys;
    void Record(string action)
    {
        string value = String.Format("{0:o} {1} clicks={2} keys={3} location={4},{5}\r\n", DateTime.UtcNow, action, clicks, keys, Left, Top);
        if (!File.Exists(log) || new FileInfo(log).Length < 20480) File.AppendAllText(log, value);
    }
    ComputerChannelProbe()
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        if (!new DirectoryInfo(root).Name.StartsWith("tagma-p0-channel-")) throw new Exception("Unowned probe directory");
        if (File.ReadAllText(Path.Combine(root, "owner.txt")) != "tagma-p0-channel/v1") throw new Exception("Owner mismatch");
        log = Path.Combine(root, "events.txt");
        Text = "Tagma P0 computer channel probe";
        ClientSize = new Size(500, 240);
        StartPosition = FormStartPosition.CenterScreen;
        KeyPreview = true;
        var heading = new Label { Text = "Owned diagnostic window - synthetic input only", Left = 20, Top = 20, Width = 460, Height = 28 };
        input.SetBounds(20, 65, 460, 30);
        input.AccessibleName = "Probe input";
        var button = new Button { Text = "Click probe", Left = 20, Top = 115, Width = 140, Height = 35 };
        button.Click += delegate { clicks++; status.Text = "Clicks: " + clicks + "; Keys: " + keys; Record("button-click"); };
        status.SetBounds(20, 170, 460, 35);
        status.Text = "Clicks: 0; Keys: 0";
        Controls.AddRange(new Control[] { heading, input, button, status });
        // Force ongoing repaint without injecting input or capturing any screen.
        var pulse = new Timer { Interval = 250 };
        bool bright = false;
        pulse.Tick += delegate { bright = !bright; heading.BackColor = bright ? Color.LightYellow : SystemColors.Control; };
        pulse.Start();
        AcceptButton = button;
        Shown += delegate { input.Focus(); Record("shown"); };
        KeyDown += delegate { keys++; status.Text = "Clicks: " + clicks + "; Keys: " + keys; Record("key-down"); };
        LocationChanged += delegate { if (Visible) Record("moved"); };
        FormClosed += delegate { pulse.Stop(); pulse.Dispose(); Record("closed"); };
    }
    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles();
        Application.Run(new ComputerChannelProbe());
    }
}
