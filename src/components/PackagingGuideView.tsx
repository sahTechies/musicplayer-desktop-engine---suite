import React, { useState } from 'react';
import { Terminal, Copy, Check, ShieldCheck, Cpu, HardDrive, PackageCheck } from 'lucide-react';

export const PackagingGuideView: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: '1. Prerequisites & Environment Check',
      description: 'Ensure Windows 10/11 has 64-bit JDK 21 LTS (Eclipse Temurin or Oracle), Maven 3.9+, and WiX Toolset 3.11 configured in PATH.',
      commands: `java -version
mvn -version
candle.exe -?`,
    },
    {
      title: '2. Fast Development Launch via JavaFX Maven Plugin',
      description: 'Executes the MainApp class with the Windows JavaFX native media binaries attached, automatically initializing SQLite.',
      commands: `cd music-player
mvn clean compile javafx:run`,
    },
    {
      title: '3. Package Shaded Executable Fat-JAR',
      description: 'Runs maven-shade-plugin to assemble all SQLite JDBC drivers, Jaudiotagger ID3 extractors, and SLF4J into a single standalone JAR.',
      commands: `mvn clean package`,
    },
    {
      title: '4. Build Standalone Windows Portable Directory (App Image)',
      description: 'Uses jpackage to produce an isolated, zero-dependency Windows folder containing MusicPlayer.exe and a minimized Java 21 runtime.',
      commands: `if not exist "dist" mkdir dist
if not exist "input_jar" mkdir input_jar
copy target\\music-player-1.0.0-all.jar input_jar\\

jpackage ^
  --type app-image ^
  --name "MusicPlayer" ^
  --app-version "1.0.0" ^
  --input "input_jar" ^
  --main-jar "music-player-1.0.0-all.jar" ^
  --main-class "com.musicplayer.MainApp" ^
  --dest "dist" ^
  --java-options "-XX:+UseG1GC -XX:MaxGCPauseMillis=20 -Xmx1024m" ^
  --win-menu ^
  --win-shortcut`,
    },
    {
      title: '5. Build Enterprise Windows Installer (.exe / .msi)',
      description: 'Generates a signed, modern Windows setup wizard with desktop shortcut, start menu entry, and uninstaller support via WiX.',
      commands: `jpackage ^
  --type exe ^
  --name "MusicPlayerInstaller" ^
  --app-version "1.0.0" ^
  --vendor "MusicPlayer Desktop Systems" ^
  --input "input_jar" ^
  --main-jar "music-player-1.0.0-all.jar" ^
  --main-class "com.musicplayer.MainApp" ^
  --dest "dist" ^
  --win-dir-chooser ^
  --win-menu ^
  --win-shortcut`,
    },
  ];

  return (
    <div className="w-full bg-[#0c0d14] border border-slate-800 rounded-xl p-6 text-slate-200 shadow-2xl space-y-6 font-sans">
      {/* HEADER */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-sky-400" />
          <span>Windows 10 / 11 Build &amp; Native Packaging Guide</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Step-by-step terminal instructions for Maven compilation, shaded fat-JAR generation, and native jpackage Windows executable deployment.
        </p>
      </div>

      {/* ARCHITECTURE SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#11131e] border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs">
            <Cpu className="w-4 h-4" />
            <span>Target Runtime</span>
          </div>
          <p className="text-sm font-bold text-white">Java 21 LTS (64-bit)</p>
          <p className="text-[11px] text-slate-400">
            Engineered for Windows 10/11 with JavaFX Media Windows native dynamic library bindings.
          </p>
        </div>

        <div className="p-4 bg-[#11131e] border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
            <HardDrive className="w-4 h-4" />
            <span>Embedded SQLite 3.45</span>
          </div>
          <p className="text-sm font-bold text-white">Zero-Config Persistence</p>
          <p className="text-[11px] text-slate-400">
            Auto-provisions schema and user settings at <code className="text-slate-300 font-mono">%USERPROFILE%\.musicplayer</code>.
          </p>
        </div>

        <div className="p-4 bg-[#11131e] border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
            <PackageCheck className="w-4 h-4" />
            <span>Standalone EXE Installer</span>
          </div>
          <p className="text-sm font-bold text-white">jpackage + WiX Toolset</p>
          <p className="text-[11px] text-slate-400">
            Self-contained Windows launcher with embedded JRE image and zero client prerequisite requirements.
          </p>
        </div>
      </div>

      {/* STEP-BY-STEP TERMINAL COMMANDS */}
      <div className="space-y-4">
        {steps.map((step, idx) => (
          <div key={idx} className="p-4 bg-[#11131e] border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-white">{step.title}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{step.description}</p>
              </div>

              <button
                onClick={() => copyToClipboard(step.commands, idx)}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#171a26] hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors shrink-0"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Command</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-[#0a0b10] border border-slate-800/80 rounded-lg text-xs font-mono text-sky-300 overflow-x-auto whitespace-pre">
              {step.commands}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
