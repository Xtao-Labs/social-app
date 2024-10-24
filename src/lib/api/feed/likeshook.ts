import {
  AppBskyFeedDefs,
  AppBskyFeedGetActorLikes as GetActorLikes,
  BskyAgent,
} from '@atproto/api'

import {FeedAPI, FeedAPIResponse} from './types'

export class LikesFeedAPI implements FeedAPI {
  agent: BskyAgent
  params: GetActorLikes.QueryParams

  constructor({
    agent,
    feedParams,
  }: {
    agent: BskyAgent
    feedParams: GetActorLikes.QueryParams
  }) {
    this.agent = agent
    this.params = feedParams
  }

  async peekLatest(): Promise<AppBskyFeedDefs.FeedViewPost> {
    const res = await this.fetch({
      cursor: undefined,
      limit: 1,
    })
    return res.feed[0]
  }

  async fetch({
    cursor,
    limit,
  }: {
    cursor: string | undefined
    limit: number
  }): Promise<FeedAPIResponse> {
    const actor = this.params.actor
    const specificAgent = new BskyAgent({
      service: await getPds(actor, this.agent),
    })
    const params = {
      cursor: cursor || this.params.cursor,
      limit: limit || this.params.limit,
    }
    const list = await specificAgent.app.bsky.feed.like.list({
      repo: actor,
      ...params,
      cursor,
      limit,
    })
    const defaultReturn = {
      cursor: list.cursor,
      feed: [],
    }
    if (list.records.length === 0) {
      return defaultReturn
    }

    // split subjects into chunks of 25
    const subjectChunks = list.records
      .filter(record => record.value.subject.uri.includes('app.bsky.feed.post'))
      .reduce<string[][]>(
        (acc, record) => {
          if (acc[acc.length - 1]!.length === 25) {
            acc.push([record.value.subject.uri])
          } else {
            acc[acc.length - 1]!.push(record.value.subject.uri)
          }
          return acc
        },
        [[]],
      )

    if (subjectChunks[0].length === 0) {
      return defaultReturn
    }

    const likes = await Promise.all(
      subjectChunks.map(chunk =>
        this.agent.getPosts({
          uris: chunk,
        }),
      ),
    ).then(x =>
      x
        .flatMap(x => x.data.posts)
        .map(post => ({post, reply: undefined, reason: undefined})),
    )

    return {
      cursor: list.cursor,
      feed: likes,
    }
  }
}

const getPds = async (handle: string, agent: BskyAgent) => {
  let did = handle
  if (!did.startsWith('did:')) {
    const resolution = await agent.resolveHandle({handle})
    if (!resolution.success) throw new Error('Handle not found')
    did = resolution.data.did
  }
  const res = await fetch(`https://plc.directory/${did}`)
  if (!res.ok) throw new Error('PDS not found')
  const pds = (await res.json()) as {
    service: {
      id: string
      type: string
      serviceEndpoint: string
    }[]
  }
  const service = pds.service.find(x => x.id === '#atproto_pds')
  if (!service) throw new Error('PDS not found')
  return service.serviceEndpoint
}
