export type ItemType = "folder" | "file";

export interface DriveItem {
  id: string;
  name: string;
  itemType: ItemType;
  size: number;
  addedAt: string;
  mimeType?: string;
}

export interface TreeNode {
  id: string;
  name: string;
  itemType: ItemType;
  children?: TreeNode[];
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  loginCodeEnabled: boolean;
}

export interface PathSegment {
  id: string;
  name: string;
}

export interface TrustedDevice {
  id: string;
  label: string;
  createdAt: string;
  expiresAt: string;
}
