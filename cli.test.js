const { execSync } = require("child_process");
jest.mock("child_process"); // Mock the execSync function

test("should execute 'git push' command successfully", () => {
  // Set up mock
  execSync.mockReturnValue("git push origin main");

  // Call your function
  const result = execSync("git push origin main", { stdio: "inherit" });

  // Verify the call
  expect(execSync).toHaveBeenCalledWith("git push origin main", {
    stdio: "inherit",
  });
  expect(result).toBe("git push origin main");
});
