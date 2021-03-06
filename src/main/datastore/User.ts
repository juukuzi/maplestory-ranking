import datastore from './datastore';
import logger from '../logger';
import config from '../config';
import ExpData from './ExpData';


/**
 * サービスに登録してくれているユーザーの情報です。
 */
interface User {

    /** TwitterのID（数字） */
    id: string;

    /** Twitterのアカウント名。多分マイページとかで使う。 */
    userName: string;

    /** Mapleのキャラクター名。 */
    characterName?: string;

    /** サーバー名。Worldのキー値のほう。 */
    world?: string;

    /** 職名。Categoryのキー値のほう。 */
    category?: string;

    /** access token */
    token: string;

    /** access token secret */
    tokenSecret: string;

    /** 無効化されてたらtrue */
    disabled: boolean;

    /** 経験値情報の配列 */
    expData: ExpData[];

    /** ツイート方法 */
    tweetBy?: "selfAccount" | "botMention";

    /** 何時につぶやくか。0 ~ 23 */
    tweetAt?: number;

    /** 日次 or 週次 */
    interval?: "day" | "week";

    /** アクティブなときだけつぶやくかどうか設定 */
    tweetOnlyActiveDay?: boolean;

    /** しきい値設定 */
    threshold?: {
        value: number;
        order: number;
    };
}


namespace User {

    /** ユーザー型っぽいことを確認するための適当なタイプガード */
    function isUser(object: any): object is User {
        return object &&
            object.hasOwnProperty('id') &&
            object.hasOwnProperty('userName') &&
            object.hasOwnProperty('token') &&
            object.hasOwnProperty('tokenSecret') &&
            object.hasOwnProperty('disabled') &&
            object.hasOwnProperty('expData');
    }

    /**
     * @param id TwitterのID値（数字）の文字列
     * @returns 見つかったらUser なかったらエラー
     */
    export async function findById(id: string): Promise<User | undefined> {
        const key = datastore.key(['User', id]);
        const result = await datastore.get(key);
        const user = result[0];
        return isUser(user) ? user : undefined;
    }

    /**
     * @param id TwitterのID値（数字）の文字列
     * @param userName アットマークは外したやつ。十九字@Juukuzi -> Juukuzi
     * @param token twitter access token
     * @param tokenSecret twitter access token secret
     * @returns 既に登録してある場合はそのUserを取得、なかったら新しく作成したUser
     */
    export async function signUp(id: string, userName: string, token: string, tokenSecret: string): Promise<User> {
        // idをkye値に使うよ
        const key = datastore.key(['User', id]);

        // とりあえず保存されているものがあるか探すよ
        const result = await datastore.get(key);
        const entity = result[0];
        let user: User;

        if (isUser(entity)) {
            // とってこれた　＝　登録済みならそれに上書き
            user = {
                ...entity,
                userName,
                token,
                tokenSecret,
            };
        } else {
            // なかったときは新しく作成
            user = {
                id,
                userName,
                token,
                tokenSecret,
                disabled: true,
                expData: [],
            };
        }

        // 保存しておく
        await datastore.upsert({
            key,
            data: user
        });

        return user;
    }


    /**
     * @param user 更新するユーザー情報
     * @returns 終わったときよう
     */
    export async function update(user: User): Promise<void> {
        const key = datastore.key(['User', user.id]);
        await datastore.update({
            key,
            data: user
        });
    }

    /**
     * Datastoreに保存されている有効な全ユーザーを取得してきます。
     * @returns Datastoreに保存されているユーザー取ってくるやつ
     */
    export async function findAll(): Promise<User[]> {
        const query = datastore.createQuery('User')
            .filter('disabled', '=', false)
            .order('world')
            .order('category');
        const result = await datastore.runQuery(query);
        return result[0].filter(isUser);
    }

    /** 経験値データを追加します。設定されている長さ以上になっていたら古い分から消します。 */
    export function pushExpData(user: User, expData: ExpData): void {
        user.expData.push(expData);
        while (user.expData.length >= config.daysToKeepExpData) {
            user.expData.shift();
        }
    }

    /** 引数で指定されたユーザーの情報をdatastoreから削除します。 */
    export async function revoke(user: User): Promise<void> {
        const key = datastore.key(['User', user.id]);
        await datastore.delete(key);
    }

}


export default User;
