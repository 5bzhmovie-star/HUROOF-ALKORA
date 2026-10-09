using System;
using System.Threading;
using System.Windows.Forms;

namespace HuroofAlKora;
internal static class Program
{
    [STAThread]
    private static void Main()
    {
        using var instanceLock = new Mutex(true, @"Local\HuroofAlKoraDesktop", out bool created);
        if (!created)
        {
            MessageBox.Show("حروف الكورة مفتوحة بالفعل.", "حروف الكورة", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }
        ApplicationConfiguration.Initialize();
        Application.Run(new GameWindow());
    }
}
