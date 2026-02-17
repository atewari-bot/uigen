import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    test("isLoading starts as false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signIn", () => {
    describe("with anonymous work", () => {
      test("creates project from anon work, clears it, and navigates to the new project", async () => {
        const anonMessages = [{ role: "user", content: "build me a button" }];
        const anonFileSystemData = { "/App.jsx": { type: "file", content: "<button />" } };

        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue({ messages: anonMessages, fileSystemData: anonFileSystemData });
        vi.mocked(createProject).mockResolvedValue({ id: "anon-project-1" } as any);

        const { result } = renderHook(() => useAuth());

        let returnValue: any;
        await act(async () => {
          returnValue = await result.current.signIn("user@example.com", "password123");
        });

        expect(signInAction).toHaveBeenCalledWith("user@example.com", "password123");
        expect(createProject).toHaveBeenCalledWith({
          name: expect.stringContaining("Design from"),
          messages: anonMessages,
          data: anonFileSystemData,
        });
        expect(clearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/anon-project-1");
        expect(returnValue).toEqual({ success: true });
      });

      test("does not call getProjects when anon work is present", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue({
          messages: [{ role: "user", content: "hello" }],
          fileSystemData: {},
        });
        vi.mocked(createProject).mockResolvedValue({ id: "anon-project-2" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(getProjects).not.toHaveBeenCalled();
      });
    });

    describe("without anonymous work, with existing projects", () => {
      test("navigates to the most recent project", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue(null);
        vi.mocked(getProjects).mockResolvedValue([
          { id: "recent-project" },
          { id: "older-project" },
        ] as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(getProjects).toHaveBeenCalled();
        expect(createProject).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/recent-project");
      });
    });

    describe("without anonymous work, with no existing projects", () => {
      test("creates a new project and navigates to it", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue(null);
        vi.mocked(getProjects).mockResolvedValue([]);
        vi.mocked(createProject).mockResolvedValue({ id: "fresh-project" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(createProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^New Design #\d+$/),
          messages: [],
          data: {},
        });
        expect(mockPush).toHaveBeenCalledWith("/fresh-project");
      });
    });

    describe("with anon work but empty messages", () => {
      test("falls through to getProjects path when messages array is empty", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue({ messages: [], fileSystemData: {} });
        vi.mocked(getProjects).mockResolvedValue([{ id: "existing-project" }] as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "password123");
        });

        expect(clearAnonWork).not.toHaveBeenCalled();
        expect(getProjects).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/existing-project");
      });
    });

    describe("failed sign in", () => {
      test("returns the error result without navigating or creating a project", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid credentials" });

        const { result } = renderHook(() => useAuth());

        let returnValue: any;
        await act(async () => {
          returnValue = await result.current.signIn("user@example.com", "wrongpassword");
        });

        expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
        expect(mockPush).not.toHaveBeenCalled();
        expect(createProject).not.toHaveBeenCalled();
        expect(getProjects).not.toHaveBeenCalled();
      });

      test("passes credentials to the signIn action", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid credentials" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@test.com", "mypassword");
        });

        expect(signInAction).toHaveBeenCalledWith("test@test.com", "mypassword");
      });
    });

    describe("isLoading", () => {
      test("is true while sign in is pending and false after completion", async () => {
        let resolveSignIn!: (value: any) => void;
        vi.mocked(signInAction).mockReturnValue(
          new Promise<any>((resolve) => { resolveSignIn = resolve; })
        );
        vi.mocked(getAnonWorkData).mockReturnValue(null);
        vi.mocked(getProjects).mockResolvedValue([]);
        vi.mocked(createProject).mockResolvedValue({ id: "p1" } as any);

        const { result } = renderHook(() => useAuth());

        let signInPromise: Promise<any>;
        act(() => {
          signInPromise = result.current.signIn("user@example.com", "password123");
        });

        await waitFor(() => expect(result.current.isLoading).toBe(true));

        await act(async () => {
          resolveSignIn({ success: true });
          await signInPromise!;
        });

        expect(result.current.isLoading).toBe(false);
      });

      test("resets to false after a failed sign in", async () => {
        vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid credentials" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("user@example.com", "wrongpassword");
        });

        expect(result.current.isLoading).toBe(false);
      });

      test("resets to false even when the action throws", async () => {
        vi.mocked(signInAction).mockRejectedValue(new Error("Network error"));

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await expect(result.current.signIn("user@example.com", "password123")).rejects.toThrow(
            "Network error"
          );
        });

        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("signUp", () => {
    describe("with anonymous work", () => {
      test("creates project from anon work, clears it, and navigates to the new project", async () => {
        const anonMessages = [{ role: "user", content: "make a form" }];
        const anonFileSystemData = { "/App.jsx": { type: "file", content: "<form />" } };

        vi.mocked(signUpAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue({ messages: anonMessages, fileSystemData: anonFileSystemData });
        vi.mocked(createProject).mockResolvedValue({ id: "signup-project-1" } as any);

        const { result } = renderHook(() => useAuth());

        let returnValue: any;
        await act(async () => {
          returnValue = await result.current.signUp("newuser@example.com", "securepassword");
        });

        expect(signUpAction).toHaveBeenCalledWith("newuser@example.com", "securepassword");
        expect(createProject).toHaveBeenCalledWith({
          name: expect.stringContaining("Design from"),
          messages: anonMessages,
          data: anonFileSystemData,
        });
        expect(clearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/signup-project-1");
        expect(returnValue).toEqual({ success: true });
      });
    });

    describe("without anonymous work, with existing projects", () => {
      test("navigates to the most recent project", async () => {
        vi.mocked(signUpAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue(null);
        vi.mocked(getProjects).mockResolvedValue([{ id: "recent-project" }] as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("newuser@example.com", "securepassword");
        });

        expect(mockPush).toHaveBeenCalledWith("/recent-project");
        expect(createProject).not.toHaveBeenCalled();
      });
    });

    describe("without anonymous work, with no existing projects", () => {
      test("creates a new project and navigates to it", async () => {
        vi.mocked(signUpAction).mockResolvedValue({ success: true });
        vi.mocked(getAnonWorkData).mockReturnValue(null);
        vi.mocked(getProjects).mockResolvedValue([]);
        vi.mocked(createProject).mockResolvedValue({ id: "brand-new-project" } as any);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("newuser@example.com", "securepassword");
        });

        expect(createProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/^New Design #\d+$/),
          messages: [],
          data: {},
        });
        expect(mockPush).toHaveBeenCalledWith("/brand-new-project");
      });
    });

    describe("failed sign up", () => {
      test("returns the error result without navigating or creating a project", async () => {
        vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email already registered" });

        const { result } = renderHook(() => useAuth());

        let returnValue: any;
        await act(async () => {
          returnValue = await result.current.signUp("existing@example.com", "password123");
        });

        expect(returnValue).toEqual({ success: false, error: "Email already registered" });
        expect(mockPush).not.toHaveBeenCalled();
        expect(createProject).not.toHaveBeenCalled();
      });

      test("passes credentials to the signUp action", async () => {
        vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email already registered" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("new@test.com", "mypassword");
        });

        expect(signUpAction).toHaveBeenCalledWith("new@test.com", "mypassword");
      });
    });

    describe("isLoading", () => {
      test("is true while sign up is pending and false after completion", async () => {
        let resolveSignUp!: (value: any) => void;
        vi.mocked(signUpAction).mockReturnValue(
          new Promise<any>((resolve) => { resolveSignUp = resolve; })
        );
        vi.mocked(getAnonWorkData).mockReturnValue(null);
        vi.mocked(getProjects).mockResolvedValue([]);
        vi.mocked(createProject).mockResolvedValue({ id: "p2" } as any);

        const { result } = renderHook(() => useAuth());

        let signUpPromise: Promise<any>;
        act(() => {
          signUpPromise = result.current.signUp("user@example.com", "password123");
        });

        await waitFor(() => expect(result.current.isLoading).toBe(true));

        await act(async () => {
          resolveSignUp({ success: true });
          await signUpPromise!;
        });

        expect(result.current.isLoading).toBe(false);
      });

      test("resets to false after a failed sign up", async () => {
        vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email already registered" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signUp("existing@example.com", "password123");
        });

        expect(result.current.isLoading).toBe(false);
      });

      test("resets to false even when the action throws", async () => {
        vi.mocked(signUpAction).mockRejectedValue(new Error("Server error"));

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await expect(result.current.signUp("user@example.com", "password123")).rejects.toThrow(
            "Server error"
          );
        });

        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
