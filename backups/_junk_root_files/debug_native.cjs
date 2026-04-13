const paths = [
    './node_modules/@tailwindcss/oxide/native/oxide.win32-arm64-msvc.node',
    './node_modules/@tailwindcss/oxide/native/oxide.win32-x64-msvc.node'
];

paths.forEach(p => {
    try {
        console.log(`Attempting to load: ${p}`);
        require(p);
        console.log(`SUCCESS: ${p}`);
    } catch (e) {
        console.log(`FAILED: ${p}`);
        console.log(e.message);
    }
});
