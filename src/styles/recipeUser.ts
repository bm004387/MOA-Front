import { StyleSheet } from 'react-native';

const palette = {
  ink: '#352B24',
  muted: '#8D8075',
  line: '#EEE6DD',
  surface: '#FFFFFF',
  accent: '#C87945',
  accentDark: '#8F4D2B',
  canvas: '#FBF8F3',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.canvas },
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30 },
  identity: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  avatar: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: palette.surface, fontSize: 27, fontWeight: '800' },
  identityCopy: { flex: 1, marginLeft: 14 },
  nickname: { color: palette.ink, fontSize: 19, fontWeight: '800' },
  username: { color: palette.muted, fontSize: 12, marginTop: 4 },
  stats: { flexDirection: 'row', marginTop: 16, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.line },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: palette.ink, fontSize: 17, fontWeight: '800' },
  statLabel: { color: palette.muted, fontSize: 11, marginTop: 4 },
  followButton: { minWidth: 96, minHeight: 38, marginTop: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', borderRadius: 12, backgroundColor: palette.ink },
  followingButton: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  followText: { color: palette.surface, fontSize: 12, fontWeight: '700' },
  followingText: { color: palette.ink },
  sectionHeading: { marginTop: 24, marginBottom: 12 },
  sectionActions: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: palette.ink, fontSize: 17, fontWeight: '800' },
  sectionCaption: { color: palette.muted, fontSize: 11, marginTop: 4 },
  writeIconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6E7DE' },
  writeIcon: { color: palette.accentDark, fontSize: 23, lineHeight: 26 },
  writeButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 15, borderWidth: 1, borderColor: '#E7D5C6' },
  writeButtonText: { color: palette.accent, fontSize: 11, fontWeight: '700' },
  logoutButton: { minHeight: 38, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: palette.muted, fontSize: 12, fontWeight: '600' },
  loadingContent: { flex: 1 },
  loadErrorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadError: { color: palette.muted, fontSize: 13, textAlign: 'center' },
  retryButton: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 16, backgroundColor: '#F6E7DE' },
  retryText: { color: palette.accentDark, fontSize: 12, fontWeight: '700' },
  error: { paddingHorizontal: 20, paddingVertical: 24, color: palette.accentDark, fontSize: 13, textAlign: 'center' },
});

export default styles;
