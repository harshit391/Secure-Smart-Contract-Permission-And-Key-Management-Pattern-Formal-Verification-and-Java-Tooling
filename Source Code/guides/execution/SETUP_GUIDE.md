# Setup Guide: Ubuntu 24.04 LTS on WSL for This Project

> **This guide walks you through setting up a complete development environment from
> scratch on Windows using WSL (Windows Subsystem for Linux) with Ubuntu 24.04 LTS.**
>
> Includes: Node.js v24 via nvm, Python 3.10 via deadsnakes PPA, Java 17+, Maven,
> Slither, Mythril, Certora CLI, and all project dependencies.
>
> Common errors you will encounter are documented with fixes.

---

## Table of Contents

1. [Install WSL and Ubuntu 24.04 LTS](#1-install-wsl-and-ubuntu-2404-lts)
2. [Initial Ubuntu Setup](#2-initial-ubuntu-setup)
3. [Install Node.js v24 via nvm](#3-install-nodejs-v24-via-nvm)
4. [Install Python 3.10 via deadsnakes PPA](#4-install-python-310-via-deadsnakes-ppa)
5. [Install Java 17 and Maven](#5-install-java-17-and-maven)
6. [Install Blockchain Security Tools](#6-install-blockchain-security-tools)
7. [Clone and Set Up the Project](#7-clone-and-set-up-the-project)
8. [Verify Everything Works](#8-verify-everything-works)
9. [Errors We Encountered and How We Fixed Them](#9-errors-we-encountered-and-how-we-fixed-them)

---

## 1. Install WSL and Ubuntu 24.04 LTS

### 1.1 Enable WSL on Windows

Open **PowerShell as Administrator** (right-click Start -> Terminal (Admin)) and run:

```powershell
wsl --install
```

This enables WSL2 and installs the default Ubuntu distribution. **Restart your computer
when prompted.**

### 1.2 Install Ubuntu 24.04 LTS Specifically

After restart, open PowerShell again and check available distributions:

```powershell
wsl --list --online
```

Output:
```
The following is a list of valid distributions that can be installed.
Install using 'wsl --install -d <Distro>'.

NAME                            FRIENDLY NAME
Ubuntu                          Ubuntu
Debian                          Debian GNU/Linux
kali-linux                      Kali Linux Rolling
Ubuntu-18.04                    Ubuntu 18.04 LTS
Ubuntu-20.04                    Ubuntu 20.04 LTS
Ubuntu-22.04                    Ubuntu 22.04 LTS
Ubuntu-24.04                    Ubuntu 24.04 LTS
...
```

Install Ubuntu 24.04 LTS:

```powershell
wsl --install -d Ubuntu-24.04
```

This downloads and installs Ubuntu 24.04 LTS. You will be prompted to create a UNIX
username and password:

```
Installing, this may take a few minutes...
Please create a default UNIX user account. The username does not need to match your Windows username.
For more information visit: https://aka.ms/wslusers
Enter new UNIX username: harshit
New password: ********
Retype new password: ********
passwd: password updated successfully
Installation successful!
```

### 1.3 Set Ubuntu 24.04 as Default (Optional)

If you have multiple WSL distributions:

```powershell
wsl --set-default Ubuntu-24.04
```

### 1.4 Launch Ubuntu

From PowerShell:
```powershell
wsl -d Ubuntu-24.04
```

Or just search for "Ubuntu 24.04 LTS" in the Start menu.

You should see:
```
harshit@DESKTOP-XXXX:~$
```

### 1.5 Verify Ubuntu Version

```bash
lsb_release -a
```

Output:
```
No LSB modules are available.
Distributor ID: Ubuntu
Description:    Ubuntu 24.04.1 LTS
Release:        24.04
Codename:       noble
```

---

## 2. Initial Ubuntu Setup

### 2.1 Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

This fetches the latest package lists and upgrades all installed packages. You will see
a long list of packages being downloaded and installed.

### 2.2 Install Essential Build Tools

```bash
sudo apt install -y build-essential curl wget git unzip software-properties-common
```

> **Why `software-properties-common`?** We need it for `add-apt-repository` (used later
> to add the deadsnakes PPA for Python 3.10). Without it, you will get the error
> documented in [Section 9.4](#94-error-add-apt-repository-command-not-found).

### 2.3 Clone the Project Repository

```bash
cd ~
git clone https://github.com/harshit391/ResearchPaper.git
cd ResearchPaper
```

> **Performance note:** Running `npm install` or `npx hardhat compile` on files stored
> on `/mnt/c/` (Windows filesystem) is significantly slower than running on the native
> Linux filesystem (`~/`). The `git clone` above puts the repo directly in `~/ResearchPaper/`
> on the Linux filesystem, which is the fastest option.

---

## 3. Install Node.js v24 via nvm

We use **nvm (Node Version Manager)** to install and manage Node.js versions. This is
the recommended approach because Ubuntu 24.04's default `apt` Node.js package is
outdated (v18.x).

### 3.1 Install nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Output:
```
=> Downloading nvm from git to '/home/harshit/.nvm'
=> Cloning into '/home/harshit/.nvm'...
=> Compressing and cleaning up git repository

=> Appending nvm source string to /home/harshit/.bashrc
=> Appending bash_completion nvm source string to /home/harshit/.bashrc
=> Close and reopen your terminal to start using nvm or run the following to use it now:

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

### 3.2 ERROR: `nvm: command not found`

If you try to use `nvm` immediately after installation:

```bash
nvm --version
```

You will get:
```
bash: nvm: command not found
```

**Why this happens:** nvm was added to `~/.bashrc` but the current shell session has
not reloaded the file yet.

**Fix:** Either reload your shell or source the file manually:

```bash
# Option A: Reload bashrc
source ~/.bashrc

# Option B: Open a new terminal window

# Option C: Source nvm directly
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Now verify:
```bash
nvm --version
```

Output:
```
0.40.1
```

### 3.3 Install Node.js v24

```bash
nvm install 24
```

Output:
```
Downloading and installing node v24.0.0...
Downloading https://nodejs.org/dist/v24.0.0/node-v24.0.0-linux-x64.tar.xz...
######################################################################### 100.0%
Computing checksum with sha256sum
Checksums matched!
Now using node v24.0.0 (npm v11.4.2)
Creating default alias: default -> 24 (-> v24.0.0)
```

### 3.4 ERROR: Old Node.js Version Still Active

If Node.js was previously installed via `apt`, the system version may take priority:

```bash
node --version
```

Output (wrong):
```
v18.19.1
```

**Why this happens:** The `apt`-installed Node.js binary is in `/usr/bin/node`, which
may come before nvm's path in `$PATH`.

**Fix:** Make sure nvm is sourced and use `nvm use`:

```bash
source ~/.bashrc
nvm use 24
```

Output:
```
Now using node v24.0.0 (npm v11.4.2)
```

If the `apt` version keeps interfering, remove it:

```bash
sudo apt remove -y nodejs
```

Set Node.js v24 as the default for all new terminal sessions:

```bash
nvm alias default 24
```

### 3.5 ERROR: `npm ERR! engine Unsupported engine` When Installing Packages

When running `npm install` in the project, you might see:

```
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: 'some-package@x.x.x',
npm warn EBADENGINE   required: { node: '>=14 <21' },
npm warn EBADENGINE   current: { node: 'v24.0.0', npm: '11.4.2' }
npm warn EBADENGINE }
```

**Why this happens:** Some packages have not updated their `engines` field to include
Node.js v24, even though they work fine with it.

**Fix:** These are warnings, not errors. The packages still install and work correctly.
If `npm install` fails outright, use:

```bash
npm install --legacy-peer-deps
```

Or to suppress engine warnings:

```bash
npm install --engine-strict=false
```

### 3.6 Verify Node.js Installation

```bash
node --version
npm --version
npx --version
```

Expected:
```
v24.0.0
11.4.2
11.4.2
```

---

## 4. Install Python 3.10 via deadsnakes PPA

Ubuntu 24.04 ships with Python 3.12 as the default. However, some blockchain tools
(particularly older versions of Mythril and Slither) work best with Python 3.10. We
install Python 3.10 alongside the system Python using the **deadsnakes PPA**.

### 4.1 ERROR: `add-apt-repository: command not found`

If you try to add the PPA without installing prerequisites:

```bash
sudo add-apt-repository ppa:deadsnakes/ppa
```

You will get:
```
sudo: add-apt-repository: command not found
```

**Why this happens:** The `add-apt-repository` command comes from the
`software-properties-common` package, which is not installed by default on minimal
Ubuntu installations (including some WSL images).

**Fix:** Install the required package:

```bash
sudo apt install -y software-properties-common
```

### 4.2 Add the deadsnakes PPA

```bash
sudo add-apt-repository ppa:deadsnakes/ppa
```

Output:
```
Repository: 'deb https://ppa.launchpadcontent.net/deadsnakes/ppa/ubuntu/ noble main'
Description:
This PPA contains more recent Python versions packaged for Ubuntu.

...

Adding repository.
Press [ENTER] to continue or Ctrl-c to cancel.
```

Press **ENTER** to confirm.

Then update the package list:

```bash
sudo apt update
```

### 4.3 Install Python 3.10

```bash
sudo apt install -y python3.10 python3.10-venv python3.10-dev python3.10-distutils
```

### 4.4 ERROR: `E: Unable to locate package python3.10-distutils`

On Ubuntu 24.04, you may see:

```
E: Unable to locate package python3.10-distutils
```

**Why this happens:** Starting with Python 3.12, `distutils` was removed from the
standard library (PEP 632). The deadsnakes PPA for Noble (24.04) may not include the
`-distutils` package for Python 3.10 because `setuptools` now bundles it.

**Fix:** Skip `python3.10-distutils` and install `python3.10-dev` and `python3.10-venv`
only. Then install pip via `get-pip.py`:

```bash
sudo apt install -y python3.10 python3.10-venv python3.10-dev
```

### 4.5 Install pip for Python 3.10

```bash
curl -sS https://bootstrap.pypa.io/get-pip.py | python3.10
```

Output:
```
Downloading pip-24.x.x-py3-none-any.whl (1.8 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1.8/1.8 MB 12.4 MB/s eta 0:00:00
Installing collected packages: pip
Successfully installed pip-24.x.x
```

### 4.6 ERROR: `pip3.10: command not found`

After installing pip via `get-pip.py`, you might find:

```bash
pip3.10 --version
```

```
bash: pip3.10: command not found
```

**Why this happens:** `get-pip.py` installs pip to `~/.local/bin/`, which may not be
in your `$PATH`.

**Fix:** Add `~/.local/bin` to your PATH:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

Now verify:
```bash
pip3.10 --version
```

Output:
```
pip 24.x.x from /home/harshit/.local/lib/python3.10/site-packages/pip (python 3.10)
```

### 4.7 Set Up Python 3.10 as `python3` (Optional)

If you want `python3` to point to Python 3.10 instead of the system 3.12:

```bash
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 2
sudo update-alternatives --config python3
```

Choose the number for `python3.10`. However, **be careful** -- changing the system
`python3` can break `apt` and other system tools that depend on Python 3.12.

**Recommended approach:** Use `python3.10` explicitly instead of changing the system
default:

```bash
python3.10 --version
# Python 3.10.x

python3.10 -m pip install some-package
```

### 4.8 ERROR: `ModuleNotFoundError: No module named 'apt_pkg'`

If you change the system `python3` to 3.10, running `apt` may break:

```bash
sudo apt update
```

```
Traceback (most recent call last):
  File "/usr/lib/command-not-found", line 28, in <module>
    from CommandNotFound import CommandNotFound
  ...
ModuleNotFoundError: No module named 'apt_pkg'
```

**Why this happens:** Ubuntu's `apt` Python modules are compiled for Python 3.12. When
you switch the default to 3.10, it can't find `apt_pkg`.

**Fix:** Revert the system `python3` back to 3.12:

```bash
sudo update-alternatives --config python3
# Select the number for python3.12
```

And use `python3.10` explicitly for your project tools. This is why we recommend NOT
changing the system default.

### 4.9 Create a Virtual Environment (Recommended)

For the best isolation, use a Python 3.10 virtual environment for blockchain tools:

```bash
python3.10 -m venv ~/venv-sc
source ~/venv-sc/bin/activate
```

Your prompt changes to:
```
(venv-sc) harshit@DESKTOP-XXXX:~$
```

Inside this venv, `python` and `pip` automatically point to Python 3.10:

```bash
python --version    # Python 3.10.x
pip --version       # pip for Python 3.10
```

> **Add to bashrc** so the venv activates automatically in new terminals:
> ```bash
> echo 'source ~/venv-sc/bin/activate' >> ~/.bashrc
> ```

### 4.10 Verify Python Installation

```bash
python3.10 --version
pip3.10 --version
```

Expected:
```
Python 3.10.16
pip 24.x.x from /home/harshit/.local/lib/python3.10/site-packages/pip (python 3.10)
```

Or if using a venv:
```bash
python --version
pip --version
```

---

## 5. Install Java 17 and Maven

### 5.1 Install Java 17 (OpenJDK)

```bash
sudo apt install -y openjdk-17-jdk
```

### 5.2 ERROR: Multiple Java Versions Installed

Ubuntu 24.04 may have Java 21 pre-installed. Check:

```bash
java --version
```

If it shows Java 21 instead of 17:
```
openjdk 21.0.5 2024-10-15
OpenJDK Runtime Environment (build 21.0.5+11-Ubuntu-1ubuntu124.04)
OpenJDK 64-Bit Server VM (build 21.0.5+11-Ubuntu-1ubuntu124.04, mixed mode, sharing)
```

**Fix:** Select Java 17 using `update-alternatives`:

```bash
sudo update-alternatives --config java
```

Output:
```
There are 2 choices for the alternative java (providing /usr/bin/java).

  Selection    Path                                         Priority   Status
------------------------------------------------------------
* 0            /usr/lib/jvm/java-21-openjdk-amd64/bin/java   2111      auto mode
  1            /usr/lib/jvm/java-17-openjdk-amd64/bin/java   1711      manual mode
  2            /usr/lib/jvm/java-21-openjdk-amd64/bin/java   2111      manual mode

Press <enter> to keep the current choice[*], or type selection number: 1
```

Type `1` and press Enter to select Java 17.

Also set the `javac` compiler:
```bash
sudo update-alternatives --config javac
# Select java-17-openjdk
```

### 5.3 Set JAVA_HOME

Many Java tools (including Maven) need `JAVA_HOME` to be set:

```bash
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
source ~/.bashrc
```

Verify:
```bash
echo $JAVA_HOME
# /usr/lib/jvm/java-17-openjdk-amd64
```

### 5.4 ERROR: `JAVA_HOME is not set` When Running Maven

If you skip setting `JAVA_HOME` and try to run Maven:

```bash
mvn --version
```

You might see:
```
Error: JAVA_HOME is not defined correctly.
  We cannot execute /usr/lib/jvm/default-java/bin/java
```

Or Maven may silently use the wrong Java version. **Fix:** Set `JAVA_HOME` as shown
above, then verify:

```bash
mvn --version
```

Expected:
```
Apache Maven 3.9.x
Maven home: /usr/share/maven
Java version: 17.0.x, vendor: Ubuntu, runtime: /usr/lib/jvm/java-17-openjdk-amd64
Default locale: en_US, platform encoding: UTF-8
OS name: "linux", version: "5.15.x", arch: "amd64", family: "unix"
```

### 5.5 Install Maven

```bash
sudo apt install -y maven
```

### 5.6 Verify Java and Maven

```bash
java --version
javac --version
mvn --version
```

Expected:
```
openjdk 17.0.x 2024-xx-xx
...

javac 17.0.x

Apache Maven 3.9.x
...
Java version: 17.0.x
```

> **Note:** The Java toolkit's `pom.xml` targets Java 17. Java versions 17, 21, and
> newer all work (backward compatible). Using Java 17 ensures exact match with the
> Maven compiler configuration.

---

## 6. Install Blockchain Security Tools

### 6.1 Install Slither (Static Analysis)

If using a Python 3.10 venv:
```bash
source ~/venv-sc/bin/activate
pip install slither-analyzer
```

If using the system Python or pip3.10:
```bash
pip3.10 install slither-analyzer
```

Verify:
```bash
slither --version
```

Expected:
```
0.10.x
```

### 6.2 ERROR: `slither: command not found` After pip Install

```bash
slither --version
```

```
bash: slither: command not found
```

**Why this happens:** pip installed slither to `~/.local/bin/` which is not in PATH.

**Fix:**
```bash
export PATH="$HOME/.local/bin:$PATH"
# Make permanent:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 6.3 Install Mythril (Symbolic Execution)

Mythril requires native dependencies. Install prerequisites first:

```bash
sudo apt install -y libssl-dev python3.10-dev
```

Then install Mythril:

```bash
pip install mythril
```

### 6.4 ERROR: Mythril Installation Fails With Build Errors

You might see errors like:

```
error: subprocess-exited-with-error

  × Building wheel for cytoolz (pyproject.toml) did not run successfully.
  │ exit code: 1
  ╰─> [14 lines of output]
      ...
      gcc: error: ...
      error: command 'x86_64-linux-gnu-gcc' failed
```

**Why this happens:** Some Mythril dependencies (like `cytoolz`, `pysha3`) require
C extensions to compile. The build tools or headers may be missing.

**Fix:** Install the required build dependencies:

```bash
sudo apt install -y build-essential python3.10-dev libffi-dev libssl-dev
pip install mythril
```

If it still fails, try installing with binary wheels only:

```bash
pip install --only-binary :all: mythril
```

Or install a specific known-good version:

```bash
pip install mythril==0.24.7
```

### 6.5 Verify Mythril

```bash
myth version
```

Expected:
```
Mythril version v0.24.x
```

### 6.6 Install Certora CLI (Formal Verification)

```bash
pip install certora-cli
```

You also need a Certora API key. Sign up at https://www.certora.com for an academic
key.

Set the key:
```bash
export CERTORAKEY=your_key_here
# Make permanent:
echo 'export CERTORAKEY=your_key_here' >> ~/.bashrc
```

Verify:
```bash
certoraRun --version
```

### 6.7 Install solc-select (Solidity Version Manager)

Slither and Mythril need the `solc` compiler available on PATH. Use `solc-select` to
manage versions:

```bash
pip install solc-select
solc-select install 0.8.20
solc-select use 0.8.20
```

Verify:
```bash
solc --version
```

Expected:
```
solc, the solidity compiler commandline interface
Version: 0.8.20+commit.a1b79de6.Linux.g++
```

---

## 7. Clone and Set Up the Project

### 7.1 Clone the Repository

**Option A: From GitHub**

```bash
cd ~
git clone https://github.com/harshit391/ResearchPaper.git
cd ResearchPaper
```

**Option B: From Windows filesystem (if files are already on this machine)**

```bash
# Copy from Windows C: drive to Linux home directory
cp -r /mnt/c/path/to/ResearchPaper ~/ResearchPaper
cd ~/ResearchPaper
```

> **Performance note:** Always work from the native Linux filesystem (`~/ResearchPaper`)
> inside WSL, not from `/mnt/c/...`. Running Node.js on Windows-mounted drives is
> 5-10x slower due to filesystem translation overhead.

### 7.2 Verify All Source Files Are Present

After cloning, verify the repository is complete. These are the critical files
that must be present for the project to work:

```bash
cd ~/ResearchPaper

echo "--- Contracts (6 files) ---"
ls contracts/*.sol contracts/utils/*.sol

echo "--- Tests (4 files) ---"
ls test/unit/*.test.js test/adversarial/*.test.js

echo "--- Scripts (4 files) ---"
ls scripts/*.js

echo "--- Specs (3 files) ---"
ls specs/*.spec

echo "--- Config files ---"
ls package.json package-lock.json hardhat.config.js slither.config.json certora.conf

echo "--- Java toolkit ---"
ls java-toolkit/pom.xml java-toolkit/src/main/java/edu/chitkara/scverify/*.java

echo "--- Demo script ---"
ls run.sh
```

Expected output:
```
--- Contracts (6 files) ---
contracts/Governed.sol  contracts/MultiSigWallet.sol  contracts/RBACManager.sol
contracts/SimpleAdmin.sol  contracts/TimelockController.sol  contracts/utils/ECDSA.sol

--- Tests (4 files) ---
test/unit/MultiSigWallet.test.js  test/unit/RBACManager.test.js
test/unit/TimelockController.test.js  test/adversarial/adversarial.test.js

--- Scripts (4 files) ---
scripts/demo.js  scripts/deploy.js  scripts/gas-profile.js  scripts/interactive.js

--- Specs (3 files) ---
specs/multisig.spec  specs/rbac.spec  specs/timelock.spec

--- Config files ---
package.json  package-lock.json  hardhat.config.js  slither.config.json  certora.conf

--- Java toolkit ---
java-toolkit/pom.xml
java-toolkit/src/main/java/edu/chitkara/scverify/CertoraRunner.java
java-toolkit/src/main/java/edu/chitkara/scverify/DeploymentManager.java
java-toolkit/src/main/java/edu/chitkara/scverify/Finding.java
java-toolkit/src/main/java/edu/chitkara/scverify/MythrilRunner.java
java-toolkit/src/main/java/edu/chitkara/scverify/ReportGenerator.java
java-toolkit/src/main/java/edu/chitkara/scverify/SlitherRunner.java
java-toolkit/src/main/java/edu/chitkara/scverify/VerificationPipeline.java
java-toolkit/src/main/java/edu/chitkara/scverify/VerificationResult.java

--- Demo script ---
run.sh
```

**If any files are missing:** Your clone is incomplete. Check that all files were
committed and pushed. The repo should have 44 tracked files.

### 7.3 Install Node.js Dependencies

```bash
cd ~/ResearchPaper
npm install
```

Expected output:
```
added 308 packages in 12s
```

> **Why `package-lock.json` matters:** This file is committed to the repo and pins
> every dependency to an exact version. `npm install` reads this lock file to ensure
> everyone gets identical dependency versions, regardless of when they install. This
> guarantees reproducible builds.

### 7.4 ERROR: `npm warn EBADENGINE` With Node.js v24

```
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: '@nomicfoundation/hardhat-toolbox@4.0.0',
npm warn EBADENGINE   required: { node: '>=18.0.0 <22' },
npm warn EBADENGINE   current: { node: 'v24.0.0', npm: '11.4.2' }
npm warn EBADENGINE }
```

**This is a warning, not an error.** The packages still install and work correctly.
Hardhat and its ecosystem have not yet updated their `engines` field for Node.js v24,
but they function without issues.

If `npm install` actually fails:

```bash
npm install --legacy-peer-deps
```

### 7.5 ERROR: `npm ERR! ERESOLVE could not resolve`

If you see peer dependency resolution errors:

```
npm ERR! ERESOLVE could not resolve
npm ERR! While resolving: @nomicfoundation/hardhat-toolbox@4.0.0
```

**Fix:**
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

> **Note:** Deleting `package-lock.json` means npm will resolve fresh versions. The
> test results should still be the same, but gas numbers may differ very slightly if
> a Hardhat minor version changes.

### 7.6 Verify Hardhat

```bash
npx hardhat --version
```

Expected:
```
2.28.x
```

### 7.7 Compile Contracts to Verify Setup

```bash
npx hardhat compile
```

Expected:
```
Compiled 6 Solidity files successfully (evm target: paris)
```

If this succeeds, your Node.js + Hardhat setup is complete. You can now run all of
Steps 1-5 in HOW_TO_RUN_AND_PROVE.md.

### 7.8 Set Up Environment Variables (Optional)

These are only needed for Certora and Sepolia testnet deployment:

```bash
cd ~/ResearchPaper
cp .env.example .env
```

Edit `.env` and fill in values:
```bash
# Only needed for Certora formal verification (Step 8):
CERTORAKEY=your_certora_api_key

# Only needed for Sepolia testnet deployment (optional):
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
SEPOLIA_PRIVATE_KEY=your_private_key_without_0x
```

> **For local-only usage (Steps 1-7, 9-10):** No `.env` file is needed. Everything
> runs on Hardhat's in-memory blockchain.

### 7.9 Install Java Toolkit Dependencies

```bash
cd ~/ResearchPaper/java-toolkit
mvn clean compile
```

Expected:
```
[INFO] Compiling 8 source files with javac [debug release 17] to target/classes
[INFO] BUILD SUCCESS
```

### 7.10 Create Reports Directory

The `reports/` directory is where generated output goes. After cloning, make sure it
exists:

```bash
cd ~/ResearchPaper
mkdir -p reports
```

### 7.11 Make Demo Script Executable

```bash
chmod +x ~/ResearchPaper/run.sh
```

---

## 8. Verify Everything Works

Run this complete verification sequence to confirm the entire environment is set up:

```bash
cd ~/ResearchPaper

echo "=== Node.js ==="
node --version

echo "=== npm ==="
npm --version

echo "=== Python 3.10 ==="
python3.10 --version

echo "=== Java ==="
java --version

echo "=== Maven ==="
mvn --version | head -1

echo "=== Slither ==="
slither --version

echo "=== solc ==="
solc --version | tail -1

echo "=== Hardhat ==="
npx hardhat --version

echo "=== Compile Contracts ==="
npx hardhat compile --force

echo "=== Run Tests ==="
npx hardhat test

echo ""
echo "================================================"
echo "  ALL CHECKS PASSED -- Environment is ready!"
echo "================================================"
```

### Expected Final Output

```
=== Node.js ===
v24.0.0
=== npm ===
11.4.2
=== Python 3.10 ===
Python 3.10.16
=== Java ===
openjdk 17.0.x ...
=== Maven ===
Apache Maven 3.9.x
=== Slither ===
0.10.x
=== solc ===
Version: 0.8.20+commit.a1b79de6.Linux.g++
=== Hardhat ===
2.28.x
=== Compile Contracts ===
Compiled 6 Solidity files successfully (evm target: paris)
=== Run Tests ===
  ...
  35 passing (2s)

================================================
  ALL CHECKS PASSED -- Environment is ready!
================================================
```

---

## 9. Errors We Encountered and How We Fixed Them

This section documents every error we hit during setup, in the order we encountered
them. These are real errors from setting up the project on a fresh Ubuntu 24.04 WSL.

### 9.1 ERROR: `wsl --install` Requires Reboot

**When:** Running `wsl --install` for the first time.

**Error:**
```
The requested operation requires elevation.
```

**Fix:** Run PowerShell as Administrator. After installation, restart the computer.
WSL will not work until you reboot.

### 9.2 ERROR: `WslRegisterDistribution failed with error: 0x80370102`

**When:** Trying to install Ubuntu 24.04.

**Error:**
```
WslRegisterDistribution failed with error: 0x80370102
Error: Please enable the Virtual Machine Platform Windows feature and ensure virtualization is enabled in the BIOS.
```

**Fix:**
1. Open PowerShell as Admin:
   ```powershell
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   ```
2. Enable virtualization in your BIOS/UEFI settings (usually under CPU settings,
   look for "Intel VT-x" or "AMD-V")
3. Restart your computer

### 9.3 ERROR: `nvm: command not found`

**When:** Right after installing nvm, trying to run `nvm install 24`.

**Error:**
```
bash: nvm: command not found
```

**Fix:** The current terminal session doesn't know about nvm yet. Reload:
```bash
source ~/.bashrc
```
See [Section 3.2](#32-error-nvm-command-not-found) for details.

### 9.4 ERROR: `add-apt-repository: command not found`

**When:** Trying to add the deadsnakes PPA for Python 3.10.

**Error:**
```
sudo: add-apt-repository: command not found
```

**Fix:** Install the required package:
```bash
sudo apt install -y software-properties-common
```
See [Section 4.1](#41-error-add-apt-repository-command-not-found) for details.

### 9.5 ERROR: `E: Unable to locate package python3.10-distutils`

**When:** Installing Python 3.10 packages.

**Error:**
```
E: Unable to locate package python3.10-distutils
```

**Fix:** Skip `python3.10-distutils`. It's not needed on Ubuntu 24.04 because
`setuptools` (included with pip) provides the same functionality:
```bash
sudo apt install -y python3.10 python3.10-venv python3.10-dev
```
See [Section 4.4](#44-error-e-unable-to-locate-package-python310-distutils) for details.

### 9.6 ERROR: `pip3.10: command not found`

**When:** After installing pip via `get-pip.py`.

**Error:**
```
bash: pip3.10: command not found
```

**Fix:** Add `~/.local/bin` to PATH:
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```
See [Section 4.6](#46-error-pip310-command-not-found) for details.

### 9.7 ERROR: `ModuleNotFoundError: No module named 'apt_pkg'`

**When:** Running `sudo apt update` after changing system `python3` to 3.10.

**Error:**
```
ModuleNotFoundError: No module named 'apt_pkg'
```

**Fix:** Do NOT change the system `python3` default. Revert to 3.12:
```bash
sudo update-alternatives --config python3
# Select python3.12
```
Use `python3.10` explicitly for your project tools.
See [Section 4.8](#48-error-modulenotfounderror-no-module-named-apt_pkg) for details.

### 9.8 ERROR: `JAVA_HOME is not set` / Wrong Java Version

**When:** Running Maven or the Java toolkit.

**Error:**
```
Error: JAVA_HOME is not defined correctly.
```

**Fix:**
```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
```
See [Section 5.4](#54-error-java_home-is-not-set-when-running-maven) for details.

### 9.9 ERROR: Old Node.js Overrides nvm Version

**When:** After installing Node.js v24 via nvm, `node --version` still shows v18.

**Error:**
```
$ node --version
v18.19.1
```

**Fix:** The `apt`-installed Node.js takes priority. Remove it and use nvm only:
```bash
sudo apt remove -y nodejs
source ~/.bashrc
nvm use 24
```
See [Section 3.4](#34-error-old-nodejs-version-still-active) for details.

### 9.10 ERROR: `npm warn EBADENGINE` With Node.js v24

**When:** Running `npm install` in the project.

**Warning:**
```
npm warn EBADENGINE Unsupported engine {
  required: { node: '>=18.0.0 <22' },
  current: { node: 'v24.0.0' }
}
```

**Fix:** This is a warning, not an error. Packages install and work correctly. If
install fails:
```bash
npm install --legacy-peer-deps
```
See [Section 7.3](#73-error-npm-warn-ebadengine-with-nodejs-v24) for details.

### 9.11 ERROR: Mythril Build Failure (C Extensions)

**When:** Running `pip install mythril`.

**Error:**
```
error: command 'x86_64-linux-gnu-gcc' failed
```

**Fix:** Install build dependencies:
```bash
sudo apt install -y build-essential python3.10-dev libffi-dev libssl-dev
pip install mythril
```
See [Section 6.4](#64-error-mythril-installation-fails-with-build-errors) for details.

### 9.12 ERROR: `slither: command not found` After pip Install

**When:** After installing slither via pip.

**Error:**
```
bash: slither: command not found
```

**Fix:** Same as pip3.10 -- add `~/.local/bin` to PATH:
```bash
export PATH="$HOME/.local/bin:$PATH"
```
See [Section 6.2](#62-error-slither-command-not-found-after-pip-install) for details.

---

## Quick Reference: Complete Setup Commands (Copy-Paste Block)

For a fast setup (after WSL + Ubuntu 24.04 is already installed), run these commands
in order. Each block should be run separately (don't paste everything at once, because
`source ~/.bashrc` reloads your shell).

### Block 1: System + nvm

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl wget git unzip software-properties-common
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
```

### Block 2: Node.js v24

```bash
nvm install 24
nvm alias default 24
node --version   # Should print: v24.0.0
npm --version    # Should print: 11.x.x
```

### Block 3: Python 3.10

```bash
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.10 python3.10-venv python3.10-dev
curl -sS https://bootstrap.pypa.io/get-pip.py | python3.10
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
python3.10 --version   # Should print: Python 3.10.x
pip3.10 --version      # Should print: pip 24.x.x ... (python 3.10)
```

### Block 4: Java 17 + Maven

```bash
sudo apt install -y openjdk-17-jdk maven
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
source ~/.bashrc
java --version    # Should print: openjdk 17.x.x
mvn --version     # Should print: Apache Maven 3.9.x ... Java version: 17.x.x
```

### Block 5: Blockchain tools

```bash
pip3.10 install slither-analyzer solc-select
solc-select install 0.8.20 && solc-select use 0.8.20
slither --version       # Should print: 0.10.x
solc --version          # Should print: 0.8.20

# Optional tools (skip if not needed):
pip3.10 install mythril            # Symbolic execution (may need: sudo apt install libffi-dev libssl-dev)
pip3.10 install certora-cli        # Formal verification (needs API key from certora.com)
```

### Block 6: Clone and set up the project

```bash
# Clone the repo
cd ~
git clone https://github.com/harshit391/ResearchPaper.git

# Install Node.js dependencies
cd ~/ResearchPaper
npm install

# Verify: compile contracts
npx hardhat compile
# Expected: Compiled 6 Solidity files successfully (evm target: paris)

# Verify: run all tests
npx hardhat test
# Expected: 35 passing (2s)

# Set up reports directory and demo script
mkdir -p reports
chmod +x run.sh
```

### Block 7: Java toolkit

```bash
cd ~/ResearchPaper/java-toolkit
mvn clean compile
# Expected: BUILD SUCCESS
```

### Block 8: Optional -- Certora key

```bash
cd ~/ResearchPaper
cp .env.example .env
# Edit .env and set: CERTORAKEY=your_actual_key
echo 'export CERTORAKEY=your_key_here' >> ~/.bashrc
source ~/.bashrc
```

### Block 9: Full verification (run all at once to confirm everything works)

```bash
cd ~/ResearchPaper
echo "=== Compile ===" && npx hardhat compile --force
echo "=== Tests ===" && npx hardhat test
echo "=== Gas Profiling ===" && npx hardhat run scripts/gas-profile.js
echo "=== Deploy ===" && npx hardhat run scripts/deploy.js
echo "=== Slither ===" && slither . --config-file slither.config.json 2>&1 | tail -5
echo ""
echo "ALL DONE. If all commands above succeeded, the environment is ready."
echo "Next: follow HOW_TO_RUN_AND_PROVE.md for step-by-step execution with evidence capture."
```

---

## Final .bashrc Additions

After all setup, your `~/.bashrc` should have these lines at the bottom:

```bash
# nvm (added automatically by nvm installer)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Local pip binaries (slither, mythril, certora, solc-select)
export PATH="$HOME/.local/bin:$PATH"

# Java
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Certora API key (if using Certora)
# export CERTORAKEY=your_key_here

# Optional: activate Python 3.10 venv automatically
# source ~/venv-sc/bin/activate
```

---

*Created: 2026-03-26*
*For: Setting up Ubuntu 24.04 LTS on WSL with all project dependencies*
