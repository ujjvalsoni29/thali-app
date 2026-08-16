import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ApiResponse,
  ErrorCode,
  WeekState,
  WeekGetBody,
  WeekClearBody,
  SlotSetBody,
  SlotClearBody,
  OverrideSetBody,
  OverrideClearBody,
  WeekdayThemeSetBody,
  DishCreateBody,
  DishUpdateBody,
  DishThemesMoveBody,
  DishArchiveBody,
  RestaurantCreateBody,
  RestaurantUpdateBody,
  RestaurantArchiveBody,
  ThemeCreateBody,
  ThemeUpdateBody,
  ThemeDeleteBody,
} from "../../shared/api";

/**
 * ApiError carries the backend's ErrorCode so callers (and error
 * boundaries) can branch on it instead of parsing the message string.
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

async function api<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const envelope = (await res.json()) as ApiResponse<T>;
  if (!envelope.ok) throw new ApiError(envelope.error.code, envelope.error.message);
  return envelope.data;
}

// -----------------------------------------------------------------------
// Reads
// -----------------------------------------------------------------------

export function useWeek(weekStart: string) {
  return useQuery({
    queryKey: ["week", weekStart],
    queryFn: () => api<WeekState>("week/get", { weekStart } satisfies WeekGetBody),
  });
}

// -----------------------------------------------------------------------
// Week / slot / override / weekday-theme mutations
// These all carry a `weekStart` in their body, so on success we invalidate
// just that one week's cached query.
// -----------------------------------------------------------------------

export function useClearWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: WeekClearBody) => api<object>("week/clear", body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["week", variables.weekStart] });
    },
  });
}

export function useSetSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SlotSetBody) => api<object>("slot/set", body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["week", variables.weekStart] });
    },
  });
}

export function useClearSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SlotClearBody) => api<object>("slot/clear", body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["week", variables.weekStart] });
    },
  });
}

export function useSetOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: OverrideSetBody) => api<object>("override/set", body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["week", variables.weekStart] });
    },
  });
}

export function useClearOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: OverrideClearBody) => api<object>("override/clear", body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["week", variables.weekStart] });
    },
  });
}

export function useSetWeekdayTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: WeekdayThemeSetBody) => api<object>("weekday/theme/set", body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["week", variables.weekStart] });
    },
  });
}

// -----------------------------------------------------------------------
// Dish / restaurant / theme roster mutations
// None of these carry a `weekStart` in their body, but a renamed dish,
// archived restaurant, or deleted theme can appear in an already-cached
// week's board. Since these hooks don't know which week(s) are on screen,
// we conservatively invalidate the whole `['week']` key prefix, which
// (via TanStack Query v5's default prefix matching) invalidates every
// cached week rather than just one.
// -----------------------------------------------------------------------

export function useCreateDish() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DishCreateBody) => api<unknown>("dish/create", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["week"] });
    },
  });
}

export function useUpdateDish() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DishUpdateBody) => api<unknown>("dish/update", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["week"] });
    },
  });
}

export function useMoveDishTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DishThemesMoveBody) => api<object>("dish/themes/move", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["week"] });
    },
  });
}

export function useArchiveDish() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DishArchiveBody) => api<object>("dish/archive", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["week"] });
    },
  });
}

export function useCreateRestaurant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RestaurantCreateBody) => api<unknown>("restaurant/create", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["week"] });
    },
  });
}

export function useUpdateRestaurant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RestaurantUpdateBody) => api<unknown>("restaurant/update", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["week"] });
    },
  });
}

export function useArchiveRestaurant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RestaurantArchiveBody) => api<object>("restaurant/archive", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["week"] });
    },
  });
}

export function useCreateTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ThemeCreateBody) => api<unknown>("theme/create", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["week"] });
    },
  });
}

export function useUpdateTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ThemeUpdateBody) => api<unknown>("theme/update", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["week"] });
    },
  });
}

export function useDeleteTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ThemeDeleteBody) => api<object>("theme/delete", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["week"] });
    },
  });
}
